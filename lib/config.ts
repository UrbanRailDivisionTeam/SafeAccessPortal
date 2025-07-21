// 系统配置文件 - 统一管理所有选项内容

import { SelectOption } from '@/types';

// 工作地点选项
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

// 作业内容选项（按作业类型分组）
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

// 作业依据选项
export const WORK_BASIS_OPTIONS: SelectOption[] = [
  { value: 'ncr', label: 'NCR' },
  { value: 'nonconformity', label: '不合格项' },
  { value: 'design_change', label: '设计变更' }
];

// 通用工具函数：根据值获取标签
export const getOptionLabel = <T extends readonly {value: string, label: string}[]>(
  options: T,
  value: string
): string => {
  const option = options.find(opt => opt.value === value);
  return option ? option.label : value;
};

// 通用工具函数：根据标签获取值
export const getOptionValue = <T extends readonly {value: string, label: string}[]>(
  options: T,
  label: string
): string => {
  const option = options.find(opt => opt.label === label);
  return option ? option.value : '';
};

// 自动化标签转换工具函数
export class OptionConverter {
  // 工作地点转换
  static workLocation = {
    toLabel: (value: string) => getOptionLabel(WORK_LOCATIONS, value),
    toValue: (label: string) => getOptionValue(WORK_LOCATIONS, label)
  };

  // 作业类型转换
  static workType = {
    toLabel: (value: string) => getOptionLabel(WORK_TYPES, value),
    toValue: (label: string) => getOptionValue(WORK_TYPES, label)
  };

  // 作业内容转换
  static workContent = {
    toLabel: (workType: string, value: string) => {
      const options = WORK_CONTENT_OPTIONS[workType] || [];
      return getOptionLabel(options, value);
    },
    toValue: (workType: string, label: string) => {
      const options = WORK_CONTENT_OPTIONS[workType] || [];
      return getOptionValue(options, label);
    }
  };

  // 危险作业类型转换
  static dangerTypes = {
    toLabel: (values: string[]) => {
      if (!values || values.length === 0) return '无';
      return values.map(value => getOptionLabel(DANGER_TYPES, value)).join('、');
    },
    toValue: (label: string) => {
      if (!label || label === '无') return [];
      const labels = label.split('、');
      return labels.map(l => getOptionValue(DANGER_TYPES, l.trim())).filter(v => v);
    }
  };

  // 作业依据转换
  static workBasis = {
    toLabel: (value: string) => getOptionLabel(WORK_BASIS_OPTIONS, value),
    toValue: (label: string) => getOptionValue(WORK_BASIS_OPTIONS, label)
  };
}

// 导出类型定义
export type WorkLocationType = typeof WORK_LOCATIONS[number]['value'];
export type WorkType = typeof WORK_TYPES[number]['value'];
export type DangerType = typeof DANGER_TYPES[number]['value'];
export type WorkBasisType = typeof WORK_BASIS_OPTIONS[number]['value'];