export type ProjectType =
  | 'branding'
  | 'web-design'
  | 'campaign'
  | 'production'
  | 'other';

export type ContactStatus = 'new' | 'in-review' | 'replied' | 'archived';

export interface ContactRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  projectType: ProjectType;
  message: string;
  status: ContactStatus;
  adminNote: string | null;
  repliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ContactRequestPayload = Pick<
  ContactRequest,
  'name' | 'email' | 'phone' | 'projectType' | 'message'
>;

export interface ContactStats {
  total: number;
  new: number;
  inReview: number;
  replied: number;
  archived: number;
}
