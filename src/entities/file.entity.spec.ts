import { File } from './file.entity';
import { User } from './user.entity';

describe('File Entity', () => {
  let file: File;
  let user: User;

  beforeEach(() => {
    file = new File();
    user = new User();
    user.email = 'test@example.com';
    user.name = 'Test User';
  });

  it('should create a file with required properties', () => {
    file.filename = 'receipt_001.pdf';
    file.originalName = 'Receipt for Travel.pdf';
    file.mimeType = 'application/pdf';
    file.size = 1024000;
    file.googleDriveId = 'drive-id-123';
    file.googleDriveUrl = 'https://drive.google.com/file/d/drive-id-123';
    file.uploadedBy = user;

    expect(file.id).toBeDefined();
    expect(file.filename).toBe('receipt_001.pdf');
    expect(file.originalName).toBe('Receipt for Travel.pdf');
    expect(file.mimeType).toBe('application/pdf');
    expect(file.size).toBe(1024000);
    expect(file.googleDriveId).toBe('drive-id-123');
    expect(file.googleDriveUrl).toBe(
      'https://drive.google.com/file/d/drive-id-123',
    );
    expect(file.uploadedBy).toBe(user);
    expect(file.createdAt).toBeInstanceOf(Date);
  });

  it('should have expenses collection initialized', () => {
    expect(file.expenses).toBeDefined();
    expect(file.expenses.length).toBe(0);
  });

  it('should handle different file types', () => {
    file.mimeType = 'image/jpeg';
    file.originalName = 'receipt.jpg';

    expect(file.mimeType).toBe('image/jpeg');
    expect(file.originalName).toBe('receipt.jpg');
  });
});
