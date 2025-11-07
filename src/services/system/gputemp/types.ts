import { Variable } from 'astal';

export interface GpuTempServiceCtor {
    sensor?: Variable<string>;
    frequency?: Variable<number>;
}

export interface GpuSensorInfo {
    path: string;
    name: string;
    type: 'amdgpu' | 'nvidia_gpu';
    label?: string;
}
