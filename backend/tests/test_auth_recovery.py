import requests
from .config import BASE_URL, print_step, random_suffix
from .state import state

def run_auth_recovery_tests():
    print_step("69. POST /api/auth/forgot-password (Forgot Password)")
    email = state.get("student_email") or f"teststudent_{random_suffix}@example.com"
    
    # Send forgot password request
    res = requests.post(
        f"{BASE_URL}/auth/forgot-password",
        json={"email": email}
    )
    assert res.status_code == 200, f"Expected 200 for forgot password, got {res.status_code}: {res.text}"
    print("✅ Forgot password request succeeded.")

    print_step("70. POST /api/auth/logout (Token Revocation)")
    # Using existing student tokens
    student_headers = state.get("student_headers")
    student_token = state.get("student_token")
    
    # We need the refresh token to log out. We didn't store it in state, so let's log in again to get one.
    password = "Securepassword123!"
    login_res = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    assert login_res.status_code == 200
    refresh_token = login_res.json()["data"]["refresh_token"]

    # Now logout
    logout_res = requests.post(
        f"{BASE_URL}/auth/logout",
        json={"refresh_token": refresh_token}
    )
    assert logout_res.status_code == 200, f"Logout failed: {logout_res.text}"
    print("✅ Logout request succeeded.")

    print_step("71. POST /api/auth/refresh (Attempt to refresh revoked token)")
    refresh_res = requests.post(
        f"{BASE_URL}/auth/refresh",
        json={"refresh_token": refresh_token}
    )
    assert refresh_res.status_code == 400, f"Expected 400 for revoked refresh token, got {refresh_res.status_code}: {refresh_res.text}"
    json_resp = refresh_res.json()
    err_msg = json_resp.get("error") or json_resp.get("detail", "")
    assert "revoked" in str(err_msg).lower(), "Error message should mention 'revoked'"
    print("✅ Revoked refresh token rejected (400).")

    print("\n[========== 🎉 ALL PHASE 4 AUTH RECOVERY TESTS PASSED 🎉 ==========]")
