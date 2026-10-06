import sys

# Import test functions
from .test_setup import run_setup
from .test_auth import run_auth_tests
from .test_rbac import run_rbac_tests
from .test_complaints import run_complaints_tests
from .test_notices import run_notices_tests
from .test_outpasses import run_outpasses_tests
from .test_timetable import run_timetable_tests
from .test_attendance import run_attendance_tests
from .test_mess import run_mess_tests
from .test_documents import run_documents_tests
from .test_infrastructure import run_infrastructure_tests
from .test_staff_faculty import run_staff_faculty_tests
from .test_audience_groups import run_audience_groups_tests
from .test_scoping_guardrails import run_scoping_guardrails_tests
from .test_auth_recovery import run_auth_recovery_tests
from .test_facilities import run_facilities_tests

def main():
    print("\n[========== 🚀 STARTING INTEGRATION TESTS 🚀 ==========]")
    
    try:
        run_setup()
        run_auth_tests()
        run_rbac_tests()
        run_complaints_tests()
        run_notices_tests()
        run_outpasses_tests()
        run_timetable_tests()
        run_attendance_tests()
        run_mess_tests()
        run_documents_tests()
        run_infrastructure_tests()
        run_staff_faculty_tests()
        run_audience_groups_tests()
        run_scoping_guardrails_tests()
        run_auth_recovery_tests()
        run_facilities_tests()


    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {e}")
        sys.exit(1)
        
    print("\n[========== 🎉 ALL INTEGRATION TESTS PASSED 🎉 ==========]")

if __name__ == "__main__":
    main()
