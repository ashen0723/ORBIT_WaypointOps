export type IssueType = 'missing' | 'damaged' | 'wrong_item';

export interface PhotoAttachment {
  id: string;
  url: string;
  name: string;
}

export interface ItemCheck {
  result: 'ok' | 'issue' | null;
  issueType: IssueType | null;
  description: string;
  photos: PhotoAttachment[];
  acceptedQty: string;
  damagedQty: string;
  missingQty: string;
}
