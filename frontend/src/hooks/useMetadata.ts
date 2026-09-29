import { useQuery } from '@tanstack/react-query';
import { metadataApi } from '@/api/metadataApi';

export function useMetadata() {
  const { data: coursesData, isLoading: isLoadingCourses } = useQuery({
    queryKey: ['metadata', 'courses'],
    queryFn: () => metadataApi.getCourses().then((res) => res.data.data),
    staleTime: Infinity, // Cache forever until manual reload
  });

  const { data: departmentsData, isLoading: isLoadingDepartments } = useQuery({
    queryKey: ['metadata', 'departments'],
    queryFn: () => metadataApi.getDepartments().then((res) => res.data.data),
    staleTime: Infinity,
  });

  const { data: rolesData, isLoading: isLoadingRoles } = useQuery({
    queryKey: ['metadata', 'roles'],
    queryFn: () => metadataApi.getRoles().then((res) => res.data.data),
    staleTime: Infinity,
  });

  const isLoading = isLoadingCourses || isLoadingDepartments || isLoadingRoles;

  return {
    courses: coursesData || [],
    departments: departmentsData || [],
    roles: rolesData || [],
    isLoading,
  };
}
