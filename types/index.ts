// 安全作业申请表单类型
export interface SafeForm {
  id?: number;
  applicationNumber: string;
  name: string;
  idNumber: string;
  companyName: string;
  phoneNumber: string;
  submitTime?: Date;
  startDate: string;
  startTime: string;
  workingHours: string;
  workLocation: string;
  workType: string;
  isProductWork: boolean;
  projectName?: string;
  vehicleNumber?: string;
  trackPosition?: string;
  workContent: string;
  workBasis?: string;
  basisNumber?: string;
  dangerTypes: string[];
  notifierName: string;
  notifierNumber: string;
  notifierDepartment: string;
  accompanyingCount: number;
  accompanyingPersons: AccompanyingPerson[];
  userId?: string;
}

// 随行人员信息类型
export interface AccompanyingPerson {
  id?: number;
  formApplicationNumber?: string;
  name: string;
  idNumber: string;
  phoneNumber: string;
}

// 公司信息类型
export interface Company {
  id: number;
  name: string;
}

// 项目信息类型
export interface Project {
  id: number;
  name: string;
}

// 人员信息类型
export interface Personnel {
  id: number;
  name: string;
  employeeNumber: string;
  department: string;
}

// 用户信息类型
export interface User {
  id: number;
  phoneNumber: string;
  lastLogin: Date;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 表单验证错误类型
export interface FormErrors {
  [key: string]: string;
}

// 预设选项类型
export interface SelectOption {
  value: string;
  label: string;
}

// 危险作业类型选项
export const DANGER_TYPES: SelectOption[] = [
  { value: 'vehicle_debugging', label: '配合车辆静、动态调试作业' },
  { value: 'high_altitude', label: '登高作业' },
  { value: 'hot_work', label: '动火作业' },
  { value: 'chemical_use', label: '危化品使用' },
  { value: 'metal_cutting', label: '金属切割作业' },
  { value: 'lifting', label: '吊装作业' },
  { value: 'temporary_electrical', label: '临时用电作业' },
  { value: 'confined_space', label: '有限空间作业' },
  { value: 'cross_operation', label: '交叉作业' },
  { value: 'edge_work', label: '临边作业' },
  { value: 'none', label: '无' }
];

// 工作时长选项
export const WORKING_HOURS: SelectOption[] = [
  { value: 'half_day', label: '半天' },
  { value: 'one_day', label: '一天' },
  { value: 'one_half_day', label: '一天半' },
  { value: 'two_days', label: '两天' },
  { value: 'two_half_days', label: '两天半' },
  { value: 'three_days', label: '三天' }
];

// 作业地点选项
export const WORK_LOCATIONS: SelectOption[] = [
  { value: 'delivery_workshop_shunting', label: '交车车间落车调车区' },
  { value: 'assembly_workshop', label: '总成车间' },
  { value: 'old_debugging', label: '老调试' },
  { value: 'new_debugging', label: '新调试' },
  { value: 'emu_debugging_base', label: '动车组调试基地' },
  { value: 'maglev_workshop', label: '磁浮厂房' },
  { value: 'outside_depot', label: '库外' }
];

// 作业类型选项
export const WORK_TYPES: SelectOption[] = [
  { value: 'quality_rework', label: '质量返工' },
  { value: 'furniture_maintenance', label: '家具维修及活动策划' },
  { value: 'tooling_work', label: '工装工具相关作业' },
  { value: 'field_research', label: '现场调研' },
  { value: 'infrastructure_construction', label: '基建施工' },
  { value: 'production_equipment_maintenance', label: '生产设备维修' },
  { value: 'office_equipment_maintenance', label: '办公设备设施维修' },
  { value: 'vehicle_maintenance', label: '车辆检修作业' },
  { value: 'component_assembly', label: '部件装配作业' },
  { value: 'vehicle_debugging_cooperation', label: '配合车辆调试作业' }
];

// 作业依据选项
export const WORK_BASIS: SelectOption[] = [
  { value: 'ncr', label: 'NCR' },
  { value: 'nonconformity', label: '不合格项' },
  { value: 'design_change', label: '设计变更' }
];

// 开工时间选项
export const START_TIMES: SelectOption[] = [
  { value: 'morning', label: '上午' },
  { value: 'afternoon', label: '下午' }
];

// 作业内容选项（根据作业类型动态显示）
export const WORK_CONTENT_OPTIONS: Record<string, SelectOption[]> = {
  quality_rework: [
    { value: 'incoming_material_rework', label: '来料不合格项返工' },
    { value: 'q30_rework', label: 'Q30不合格项返工' },
    { value: 'q40_rework', label: 'Q40不合格项返工' },
    { value: 'psi_rework', label: 'PSI不合格项返工' },
    { value: 'owner_rework', label: '业主不合格项返工' },
    { value: 'ncr_rework', label: 'NCR返工' }
  ],
  furniture_maintenance: [
    { value: 'furniture_repair', label: '家具维修' },
    { value: 'activity_planning', label: '活动策划安排' }
  ],
  tooling_work: [
    { value: 'tool_delivery', label: '工具送货' },
    { value: 'tool_maintenance', label: '工具维修' },
    { value: 'tool_measurement', label: '工具计量' },
    { value: 'tooling_delivery', label: '工装送货' },
    { value: 'tooling_verification', label: '工装验证' },
    { value: 'tooling_modification', label: '工装改造维修' },
    { value: 'tooling_after_sales', label: '工装售后维护' }
  ],
  field_research: [
    { value: 'visit_research', label: '参观调研' },
    { value: 'interview_research', label: '采访调研' },
    { value: 'process_technical_research', label: '工艺技术调研' },
    { value: 'quality_technical_research', label: '质量技术调研' },
    { value: 'equipment_facility_research', label: '设备设施调研' }
  ],
  infrastructure_construction: [
    { value: 'building_maintenance', label: '建筑物及附属设施维护维修' }
  ],
  production_equipment_maintenance: [
    { value: 'equipment_routine_maintenance', label: '设备常规维护保养及故障维修' }
  ],
  office_equipment_maintenance: [
    { value: 'computer', label: '电脑' },
    { value: 'printer_audio', label: '打印机' },
    { value: 'audio', label: '音响' }
  ],
  vehicle_maintenance: [
    { value: 'vehicle_maintenance_work', label: '车辆检修作业' }
  ],
  component_assembly: [
    { value: 'component_assembly_work', label: '部件装配作业' }
  ],
  vehicle_debugging_cooperation: [
    { value: 'static_debugging_cooperation', label: '配合静调作业' },
    { value: 'dynamic_debugging_cooperation', label: '配合动调作业' }
  ]
};