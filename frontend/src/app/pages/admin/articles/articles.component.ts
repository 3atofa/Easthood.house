import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  ARTICLE_CATEGORIES,
  Article,
  ArticleCategory
} from '../../../core/models/article.model';
import { ArticleService } from '../../../core/services/article.service';
import {
  apiErrorMessage,
  applyServerErrors
} from '../../../core/utils/form-errors';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';

@Component({
  selector: 'app-admin-articles',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModalComponent,
    ConfirmDialogComponent,
    EmptyStateComponent
  ],
  templateUrl: './articles.component.html'
})
export class AdminArticlesComponent {

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ArticleService);

  readonly categories = ARTICLE_CATEGORIES;

  readonly rows = signal<Article[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly search = signal('');
  readonly category = signal<string>('all');
  readonly page = signal(1);
  readonly limit = 20;

  readonly formOpen = signal(false);
  readonly editing = signal<Article | null>(null);
  readonly saving = signal(false);

  readonly deleting = signal<Article | null>(null);
  readonly deleteBusy = signal(false);

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.limit))
  );

  private searchTimer?: ReturnType<typeof setTimeout>;

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    slug: [''],
    excerpt: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(500)]],
    content: ['', [Validators.required, Validators.minLength(50)]],
    // Required: a site-wide fallback image makes every share look identical.
    coverImage: ['', Validators.required],
    coverAlt: [''],
    category: ['insight' as ArticleCategory, Validators.required],
    author: ['EAST HOOD'],
    metaTitle: ['', Validators.maxLength(70)],
    metaDescription: ['', Validators.maxLength(180)],
    isPublished: [false],
    tags: this.fb.array<string>([])
  });

  get tags(): FormArray {
    return this.form.get('tags') as FormArray;
  }

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api
      .list({
        page: this.page(),
        limit: this.limit,
        search: this.search(),
        category: this.category() === 'all' ? undefined : this.category()
      })
      .subscribe({
        next: result => {
          this.rows.set(result.items);
          this.total.set(result.meta?.total ?? result.items.length);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.error.set(apiErrorMessage(err));
          this.loading.set(false);
        }
      });
  }

  onSearch(value: string): void {
    this.search.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page.set(1);
      this.load();
    }, 350);
  }

  setCategory(value: string): void {
    this.category.set(value);
    this.page.set(1);
    this.load();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.page.set(page);
    this.load();
  }

  // ---- live SEO preview counters ----
  get titleLength(): number {
    return (this.form.controls.metaTitle.value || this.form.controls.title.value)
      .length;
  }

  get descriptionLength(): number {
    return (
      this.form.controls.metaDescription.value ||
      this.form.controls.excerpt.value
    ).length;
  }

  /** What Google would show as the result. */
  get previewTitle(): string {
    const value =
      this.form.controls.metaTitle.value || this.form.controls.title.value;
    return value ? `${value} — EAST HOOD` : 'Untitled — EAST HOOD';
  }

  get previewDescription(): string {
    return (
      this.form.controls.metaDescription.value ||
      this.form.controls.excerpt.value ||
      'No description yet.'
    );
  }

  get previewUrl(): string {
    const slug =
      this.form.controls.slug.value ||
      this.slugify(this.form.controls.title.value);

    return `easthood.house › articles › ${slug || 'your-slug'}`;
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      coverImage: '',
      coverAlt: '',
      category: 'insight',
      author: 'EAST HOOD',
      metaTitle: '',
      metaDescription: '',
      isPublished: false
    });
    this.setTags([]);
    this.formOpen.set(true);
  }

  openEdit(article: Article): void {
    this.editing.set(article);
    this.form.reset({
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      content: article.content,
      coverImage: article.coverImage ?? '',
      coverAlt: article.coverAlt ?? '',
      category: article.category,
      author: article.author,
      metaTitle: article.metaTitle === article.title ? '' : article.metaTitle,
      metaDescription:
        article.metaDescription === article.excerpt ? '' : article.metaDescription,
      isPublished: article.isPublished
    });
    this.setTags(article.tags ?? []);

    // The list response truncates content — fetch the full body to edit.
    this.api.bySlug(article.slug).subscribe({
      next: ({ article: full }) =>
        this.form.controls.content.setValue(full.content),
      error: () => {}
    });

    this.formOpen.set(true);
  }

  save(): void {
    if (this.saving()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const raw = this.form.getRawValue();

    const payload = {
      ...raw,
      coverAlt: raw.coverAlt?.trim() || null,
      metaTitle: raw.metaTitle?.trim() || null,
      metaDescription: raw.metaDescription?.trim() || null,
      tags: (raw.tags ?? []).map(t => String(t).trim()).filter(Boolean),
      // Slug is set once at creation; changing it later orphans every link.
      slug: this.editing() ? undefined : raw.slug?.trim() || undefined
    };

    const article = this.editing();

    const request$ = article
      ? this.api.update(article.id, payload as never)
      : this.api.create(payload as never);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.load();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(err));
        applyServerErrors(this.form, err);
      }
    });
  }

  togglePublished(article: Article, event: Event): void {
    event.stopPropagation();

    this.api
      .update(article.id, { isPublished: !article.isPublished })
      .subscribe({
        next: saved =>
          this.rows.update(rows =>
            rows.map(row => (row.id === saved.id ? { ...row, ...saved } : row))
          ),
        error: (err: unknown) => this.error.set(apiErrorMessage(err))
      });
  }

  askDelete(article: Article, event: Event): void {
    event.stopPropagation();
    this.deleting.set(article);
  }

  confirmDelete(): void {
    const article = this.deleting();
    if (!article) return;

    this.deleteBusy.set(true);

    this.api.remove(article.id).subscribe({
      next: () => {
        this.rows.update(rows => rows.filter(row => row.id !== article.id));
        this.total.update(count => Math.max(0, count - 1));
        this.deleteBusy.set(false);
        this.deleting.set(null);
      },
      error: (err: unknown) => {
        this.deleteBusy.set(false);
        this.deleting.set(null);
        this.error.set(apiErrorMessage(err));
      }
    });
  }

  addTag(): void {
    this.tags.push(this.fb.nonNullable.control(''));
  }

  removeTag(index: number): void {
    this.tags.removeAt(index);
  }

  invalid(name: string): boolean {
    const control = this.form.get(name);
    return !!control && control.touched && control.invalid;
  }

  message(name: string): string {
    const control = this.form.get(name);
    if (!control?.errors) return '';
    if (control.errors['server']) return control.errors['server'] as string;
    if (control.errors['required']) return 'Required.';
    if (control.errors['minlength']) return 'Too short.';
    if (control.errors['maxlength']) return 'Too long.';
    return 'Check this field.';
  }

  private setTags(values: string[]): void {
    this.tags.clear();
    values.forEach(v => this.tags.push(this.fb.nonNullable.control(v)));
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
