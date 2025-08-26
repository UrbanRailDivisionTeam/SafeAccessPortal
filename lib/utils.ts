import { FormErrors } from '@/types';
import { clsx, type ClassValue } from 'clsx';
import { OptionConverter, WORK_LOCATIONS, WORK_TYPES, WORK_CONTENT_OPTIONS, DANGER_TYPES } from './config';

// className合并工具函数
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// 验证手机号码格式
export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
};

// 验证身份证号码格式
export const validateIdNumber = (idNumber: string): boolean => {
  const idRegex = /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/;
  return idRegex.test(idNumber);
};

// 验证工号格式（12位数字）
export const validateEmployeeNumber = (employeeNumber: string): boolean => {
  const employeeRegex = /^\d{12}$/;
  return employeeRegex.test(employeeNumber);
};

// 验证依据编号格式
export const validateBasisNumber = (basisNumber: string, workBasis: string): boolean => {
  if (!basisNumber || !basisNumber.trim()) {
    return false;
  }
  
  const trimmedNumber = basisNumber.trim();
  
  // 根据不同的作业依据类型进行不同的格式验证
  switch (workBasis) {
    case 'ncr':
      // NCR编号需包含"ncr"(不区分大小写)
      return /ncr/i.test(trimmedNumber);
    case 'nonconformity':
      // 不合格项编号，暂无特殊格式要求，只要不为空即可
      return trimmedNumber.length > 0;
    case 'design_change':
      // 设计变更编号需包含"cm"(不区分大小写)
      return /cm/i.test(trimmedNumber);
    default:
      return trimmedNumber.length >= 6; // 默认至少6位
  }
};

// 生成申请编号
export const generateApplicationNumber = (idNumber: string, phoneNumber: string): string => {
  const timestamp = Date.now().toString();
  return `${idNumber}${phoneNumber}${timestamp}`;
};

// 验证日期是否为未来日期
export const validateFutureDate = (dateString: string): boolean => {
  const inputDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return inputDate >= today; // 允许当天开工
};

// 格式化日期
export const formatDate = (date: Date): string => {
  if (!date || isNaN(date.getTime())) {
    return '无效日期';
  }
  return date.toISOString().split('T')[0];
};

// 格式化时间戳
export const formatDateTime = (date: Date): string => {
  if (!date || isNaN(date.getTime())) {
    return '无效日期时间';
  }
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// 获取选择选项的标签
export const getOptionLabel = (options: any[], value: string): string => {
  const option = options.find(opt => opt.value === value)
  return option ? option.label : value
}

// 获取工作地点标签
export const getWorkLocationLabel = (value: string): string => {
  return OptionConverter.workLocation.toLabel(value)
}

// 获取作业内容标签
export const getWorkContentLabel = (workType: string, value: string): string => {
  return OptionConverter.workContent.toLabel(workType, value)
}

// 获取作业类型标签
export const getWorkTypeLabel = (value: string): string => {
  return OptionConverter.workType.toLabel(value)
}

// 获取危险作业类型标签
export const getDangerTypesLabel = (values: string[]): string => {
  return OptionConverter.dangerTypes.toLabel(values)
}

// 将作业地点标签转换为值
export const getWorkLocationValue = (label: string): string => {
  return OptionConverter.workLocation.toValue(label)
}

// 将作业类型标签转换为值
export const getWorkTypeValue = (label: string): string => {
  return OptionConverter.workType.toValue(label)
}

// 将作业内容标签转换为值
export const getWorkContentValue = (workType: string, label: string): string => {
  return OptionConverter.workContent.toValue(workType, label)
}

// 将危险作业类型标签转换为值数组
export const getDangerTypesValue = (label: string): string[] => {
  return OptionConverter.dangerTypes.toValue(label)
}

// 表单验证函数
export const validateForm = (formData: any): FormErrors => {
  const errors: FormErrors = {};

  // 基本信息验证
  if (!formData.name?.trim()) {
    errors.name = '姓名不能为空';
  }

  if (!formData.idNumber) {
    errors.idNumber = '身份证号不能为空';
  } else if (!validateIdNumber(formData.idNumber)) {
    errors.idNumber = '身份证号格式不正确';
  }

  if (!formData.companyName) {
    errors.companyName = '公司名称不能为空';
  }

  if (!formData.phoneNumber) {
    errors.phoneNumber = '联系电话不能为空';
  } else if (!validatePhoneNumber(formData.phoneNumber)) {
    errors.phoneNumber = '手机号码格式不正确';
  }

  // 作业信息验证
  if (!formData.startDate) {
    errors.startDate = '计划开工日期不能为空';
  } else if (!validateFutureDate(formData.startDate)) {
    errors.startDate = '开工日期不能早于今天';
  }

  if (!formData.startTime) {
    errors.startTime = '开工开始时间不能为空';
  }

  if (!formData.workingHours) {
    errors.workingHours = '工作时长不能为空';
  }

  if (!formData.workLocation) {
    errors.workLocation = '作业地点不能为空';
  }

  if (!formData.workType) {
    errors.workType = '作业类型不能为空';
  }

  if (!formData.workContent?.trim()) {
    errors.workContent = '作业内容不能为空';
  }

  // 产品类作业信息验证（当作业类型为质量返工时）
  if (formData.workType === 'quality_rework') {
    if (!formData.projectName) {
      errors.projectName = '项目名称不能为空';
    }
    if (!formData.vehicleNumber?.trim()) {
      errors.vehicleNumber = '车号不能为空';
    }
    if (!formData.trackPosition?.trim()) {
      errors.trackPosition = '车道/台位不能为空';
    }
    if (!formData.workBasis) {
      errors.workBasis = '作业依据不能为空';
    }
    if (!formData.basisNumber?.trim()) {
      errors.basisNumber = '依据编号不能为空';
    } else if (!validateBasisNumber(formData.basisNumber, formData.workBasis)) {
      errors.basisNumber = '依据编号格式不正确';
    }
  }

  // 对接人信息验证
  if (!formData.notifierName) {
    errors.notifierName = '对接人姓名不能为空';
  }

  if (!formData.notifierNumber) {
    errors.notifierNumber = '对接人工号不能为空';
  } else if (!validateEmployeeNumber(formData.notifierNumber)) {
    errors.notifierNumber = '对接人工号格式不正确（12位数字）';
  }

  if (!formData.notifierDepartment?.trim()) {
    errors.notifierDepartment = '所属部门不能为空';
  }

  // 危险作业类型验证
  if (!formData.dangerTypes || formData.dangerTypes.length === 0) {
    errors.dangerTypes = '危险作业类型不能为空，请至少选择一项';
  }

  // 随行人员信息验证
  if (formData.accompanyingCount > 0) {
    if (!formData.accompanyingPersons || formData.accompanyingPersons.length !== formData.accompanyingCount) {
      errors.accompanyingPersons = '随行人员信息不完整';
    } else {
      formData.accompanyingPersons.forEach((person: any, index: number) => {
        if (!person.name?.trim()) {
          errors[`accompanyingPerson_${index}_name`] = `随行人员${index + 1}姓名不能为空`;
        }
        if (!person.idNumber) {
          errors[`accompanyingPerson_${index}_idNumber`] = `随行人员${index + 1}身份证号不能为空`;
        } else if (!validateIdNumber(person.idNumber)) {
          errors[`accompanyingPerson_${index}_idNumber`] = `随行人员${index + 1}身份证号格式不正确`;
        }
        if (!person.phoneNumber) {
          errors[`accompanyingPerson_${index}_phoneNumber`] = `随行人员${index + 1}联系电话不能为空`;
        } else if (!validatePhoneNumber(person.phoneNumber)) {
          errors[`accompanyingPerson_${index}_phoneNumber`] = `随行人员${index + 1}手机号码格式不正确`;
        }
      });
    }
  }

  return errors;
};

// 本地存储工具函数
export const storage = {
  set: (key: string, value: any) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  },
  get: (key: string) => {
    if (typeof window !== 'undefined') {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    }
    return null;
  },
  remove: (key: string) => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  },
  clear: () => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
  }
};

// 防抖函数
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// 节流函数
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};