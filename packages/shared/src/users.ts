// users 集合文档。
export interface UserDocument {
  _id: string;
  username: string;
  name: string;
  gender: 'male' | 'female';
  className: string;
  grade: string;
  passwordHash: string;
  role: 'student' | 'admin';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string | null;
  approvedAt?: Date | null;
  rejectedReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// grades 集合文档，用作注册时可选的年级字典。
export interface GradeDocument {
  _id: string;
  name: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// classes 集合文档，用作注册和个人资料修改时可选的班级字典。
export interface ClassDocument {
  _id: string;
  name: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// sessions 集合文档。
export interface SessionDocument {
  _id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
