export type UserRole = 'student' | 'professor' | 'admin'

export interface UserProfile {
  uid: string
  name: string
  email: string
  role: UserRole
  college?: string
  department?: string
  rollNumber?: string   // students
  employeeId?: string   // professors
  photoURL?: string
  joinedClasses?: string[]  // class IDs
  createdAt: string
}

export interface ClassWorkspace {
  id: string
  name: string
  department: string
  year: string
  division: string
  semester: string
  subject: string
  professorId: string
  professorName: string
  joinCode: string
  students: string[]
  college: string
  createdAt: string
  archived?: boolean
}

export interface Resource {
  id: string
  title: string
  subject: string
  unit?: string
  type: 'Notes' | 'Question Bank' | 'Previous Year Paper' | 'PPT' | 'Practical File' | 'Lab Manual' | 'Reference PDF' | 'Syllabus'
  fileUrl: string
  fileName: string
  fileSize: number
  uploadedBy: string
  uploaderName: string
  uploadedAt: string
  visibility: 'all' | 'class'
}

export interface Assignment {
  id: string
  title: string
  instructions: string
  subject: string
  dueDate: string
  attachmentUrl?: string
  attachmentName?: string
  createdBy: string
  createdByName: string
  createdAt: string
  status: 'active' | 'closed' | 'completed'
  classId: string
}

export interface Submission {
  studentId: string
  studentName: string
  fileUrl: string
  fileName: string
  comment?: string
  submittedAt: string
  status: 'submitted' | 'late' | 'reviewed' | 'rejected'
  marks?: number
  remarks?: string
}

export interface AttendanceRecord {
  id: string
  date: string
  subject: string
  professorId: string
  professorName: string
  classId: string
  records: Record<string, 'present' | 'absent' | 'late' | 'excused'>
  lectureNumber?: number
  createdAt: string
}

export interface Announcement {
  id: string
  classId: string
  title: string
  body: string
  attachmentUrl?: string
  pinned: boolean
  createdBy: string
  createdByName: string
  createdAt: string
}

export interface ChatMessage {
  id: string
  text: string
  senderId: string
  senderName: string
  replyTo?: string
  createdAt: string
  reported?: boolean
}

export interface Query {
  id: string
  type: 'Ask Doubt' | 'Assignment Clarification' | 'Attendance Correction' | 'Request Extension' | 'Meeting Request' | 'General Academic Query'
  subject: string
  classId: string
  studentId: string
  studentName: string
  professorId: string
  professorName: string
  message: string
  attachmentUrl?: string
  status: 'open' | 'in-review' | 'replied' | 'resolved' | 'rejected'
  reply?: string
  repliedAt?: string
  createdAt: string
}

export interface Meeting {
  id: string
  title: string
  date: string
  time: string
  meetingLink: string
  agenda?: string
  createdBy: string
  createdByName: string
  createdAt: string
  classId: string
}

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  link?: string
  read: boolean
  createdAt: string
}
