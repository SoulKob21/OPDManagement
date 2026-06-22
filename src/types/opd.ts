export interface Patient {
  id: string;
  hn: string;
  citizen_id?: string;
  passport_number?: string;
  title: string; // e.g. นาย, นาง, นางสาว, เด็กชาย, เด็กหญิง
  first_name: string;
  last_name: string;
  gender: string; // ชาย, หญิง, อื่นๆ
  date_of_birth: string; // YYYY-MM-DD
  phone_number: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  medical_right: string; // สิทธิข้าราชการ, ประกันสังคม, บัตรทอง, ชำระเงินเอง
  primary_doctor: string; // แพทย์เจ้าของไข้
  allergy_note?: string;
  chronic_disease_note?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export type AppointmentStatus = 'scheduled' | 'checked_in' | 'cancelled' | 'completed' | 'no_show';

export interface Appointment {
  id: string;
  patient_id: string;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // HH:MM:SS
  department: string;
  doctor_name: string;
  reason: string;
  note?: string;
  status: AppointmentStatus;
  created_at: string;
  updated_at: string;
  // Join flag:
  patients?: Patient;
}

export type QueuePriority = 'normal' | 'urgent' | 'elderly' | 'vip';

export type QueueStatus =
  | 'waiting_registration'
  | 'waiting_screening'
  | 'waiting_doctor'
  | 'in_consultation'
  | 'waiting_payment'
  | 'waiting_pharmacy'
  | 'completed'
  | 'cancelled';

export interface Queue {
  id: string;
  queue_number: string; // e.g. Q-001
  patient_id: string;
  appointment_id?: string;
  queue_date: string; // YYYY-MM-DD
  department: string;
  priority: QueuePriority;
  status: QueueStatus;
  created_at: string;
  called_time?: string;
  completed_time?: string;
  cancelled_reason?: string;
  updated_at: string;
  // Join flags:
  patients?: Patient;
  appointments?: Appointment;
}

// Constant lists for options
export const DEPARTMENTS = [
  'อายุรกรรม (Medicine)',
  'กุมารเวชกรรม (Pediatrics)',
  'ศัลยกรรม (Surgery)',
  'สูตินรีเวชกรรม (Obstetrics & Gynecology)',
  'จักษุวิทยา (Ophthalmology)',
  'ทันตกรรม (Dental)',
  'ฉุกเฉิน (Emergency)',
];

export const TITLES = ['นาย', 'นาง', 'นางสาว', 'เด็กชาย', 'เด็กหญิง', 'พระภิกษุ'];

export const GENDERS = ['ชาย', 'หญิง', 'อื่นๆ'];

export const MEDICAL_RIGHTS = [
  'บัตรทอง (หลักประกันสุขภาพถ้วนหน้า)',
  'สิทธิประกันสังคม',
  'สิทธิข้าราชการ/รัฐวิสาหกิจ',
  'ประกันสุขภาพเอกชน',
  'ชำระเงินเอง (เงินสด/บัตรเครดิต)',
];

export interface Doctor {
  id: number;
  name: string;
  specialty: string;
  license_no: string;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export const MOCK_DOCTORS: Doctor[] = [
  { id: 1, name: 'นพ.สมศักดิ์ รักษาดี', specialty: 'อายุรกรรม', license_no: 'ว.12345', status: 'active' },
  { id: 2, name: 'พญ.สมหญิง ใจดี', specialty: 'กุมารเวชกรรม', license_no: 'ว.23456', status: 'active' },
  { id: 3, name: 'นพ.วิชัย สุขภาพดี', specialty: 'ศัลยกรรม', license_no: 'ว.34567', status: 'active' },
  { id: 4, name: 'พญ.นภา แสงจันทร์', specialty: 'สูตินรีเวชกรรม', license_no: 'ว.45678', status: 'active' },
  { id: 5, name: 'นพ.ประเสริฐ มั่นคง', specialty: 'จักษุวิทยา', license_no: 'ว.56789', status: 'active' },
];


export const PRIORITY_LABELS: Record<QueuePriority, string> = {
  normal: 'ปกติ',
  urgent: 'เร่งด่วน',
  elderly: 'ผู้สูงอายุ',
  vip: 'VIP',
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: 'นัดหมายแล้ว',
  checked_in: 'มาถึงแล้ว',
  cancelled: 'ยกเลิก',
  completed: 'เสร็จสิ้น',
  no_show: 'ไม่มาตามนัด',
};

export const QUEUE_STATUS_LABELS: Record<QueueStatus, string> = {
  waiting_registration: 'รอลงทะเบียน',
  waiting_screening: 'รอคัดกรอง',
  waiting_doctor: 'รอพบแพทย์',
  in_consultation: 'กำลังพบแพทย์',
  waiting_payment: 'รอชำระเงิน',
  waiting_pharmacy: 'รอรับยา',
  completed: 'เสร็จสิ้น',
  cancelled: 'ยกเลิก',
};

// ====== Medicine Delivery ======
export type DeliveryType = 'pharmacy' | 'pickup' | 'post' | 'rider' | 'qr' | 'other';
export type DeliveryStatus = 'pending' | 'sent_to_pharmacy' | 'preparing' | 'shipping' | 'delivered' | 'cancelled';

export interface MedicineDelivery {
  id: number;
  patient_id: string;
  delivery_type: DeliveryType;
  delivery_date: string; // YYYY-MM-DD
  prescription_count: number;
  status: DeliveryStatus;
  print_date?: string; // YYYY-MM-DD
  note?: string;
  created_at: string;
  updated_at: string;
  // Join:
  patients?: Patient;
}

export const DELIVERY_TYPE_LABELS: Record<DeliveryType, string> = {
  pharmacy: 'ส่งห้องยา',
  pickup: 'รับเอง (Walk-in)',
  post: 'ไปรษณีย์',
  rider: 'จัดส่ง Rider/Grab',
  qr: 'QR',
  other: 'อื่นๆ',
};

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: 'รอดำเนินการ',
  sent_to_pharmacy: 'ส่งห้องยา',
  preparing: 'กำลังจัดยา',
  shipping: 'กำลังจัดส่ง',
  delivered: 'จัดส่งแล้ว',
  cancelled: 'ยกเลิก',
};
