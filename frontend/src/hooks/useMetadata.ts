import { useQuery } from '@tanstack/react-query';
import { metadataApi } from '@/api/metadataApi';
import { extractItems } from '@/lib/utils';
import type { Course, Department, MetadataRole } from '@/types/api';

export function useMetadata() {
  const { data: coursesData, isLoading: isLoadingCourses } = useQuery({
    queryKey: ['metadata', 'courses'],
    queryFn: () => metadataApi.getCourses().then((res) => extractItems<Course>(res)),
    staleTime: Infinity, // Cache forever until manual reload
  });

  const { data: departmentsData, isLoading: isLoadingDepartments } = useQuery({
    queryKey: ['metadata', 'departments'],
    queryFn: () => metadataApi.getDepartments().then((res) => extractItems<Department>(res)),
    staleTime: Infinity,
  });

  const { data: rolesData, isLoading: isLoadingRoles } = useQuery({
    queryKey: ['metadata', 'roles'],
    queryFn: () => metadataApi.getRoles().then((res) => extractItems<MetadataRole>(res)),
    staleTime: Infinity,
  });

  const isLoading = isLoadingCourses || isLoadingDepartments || isLoadingRoles;

  return {
    courses: Array.isArray(coursesData) ? coursesData : [],
    departments: Array.isArray(departmentsData) ? departmentsData : [],
    roles: Array.isArray(rolesData) ? rolesData : [],
    isLoading,
  };
}

