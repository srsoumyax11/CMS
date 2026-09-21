import requests
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from .config import BASE_URL, print_step, IST
from .state import state

def run_mess_tests():
    admin_headers = state["admin_headers"]
    student_headers = state["student_headers"]

    print_step("35. POST /api/admin/mess/menu (Admin creates Monday Lunch)")
    menu_payload = {
        "day_of_week": "monday",
        "meal_type": "lunch",
        "items": "Rice, Dal, Paneer Butter Masala, Roti"
    }
    menu_res = requests.post(f"{BASE_URL}/mess/menu", json=menu_payload, headers=admin_headers)
    assert menu_res.status_code == 200, menu_res.text
    print("✅ Admin created mess menu successfully.")

    now = datetime.now(IST)

    print_step("36. POST /api/mess/feedback (Negative Test: Future Date)")
    tomorrow_str = (now + timedelta(days=1)).strftime("%Y-%m-%d")
    feedback_future = {
        "date": tomorrow_str,
        "meal_type": "lunch",
        "rating": 5,
        "comments": "Great"
    }
    fb_fail_res = requests.post(f"{BASE_URL}/mess/feedback", json=feedback_future, headers=student_headers)
    assert fb_fail_res.status_code in [400, 422]
    print("✅ Prevented feedback for future date.")

    print_step("37. POST /api/mess/optout (Negative Test: Past Date)")
    yesterday_str = (now - timedelta(days=1)).strftime("%Y-%m-%d")
    optout_past = {
        "date": yesterday_str,
        "meal_type": "dinner"
    }
    oo_fail_res = requests.post(f"{BASE_URL}/mess/optout", json=optout_past, headers=student_headers)
    assert oo_fail_res.status_code in [400, 422]
    print("✅ Prevented opt-out for past date.")

    print_step("38. POST /api/mess/feedback (Happy Path & Anti-Spam)")
    today_str = now.strftime("%Y-%m-%d")
    feedback_valid = {
        "date": today_str,
        "meal_type": "lunch",
        "rating": 4,
        "comments": "Good food"
    }
    fb_pass_res = requests.post(f"{BASE_URL}/mess/feedback", json=feedback_valid, headers=student_headers)
    assert fb_pass_res.status_code == 200
    
    fb_spam_res = requests.post(f"{BASE_URL}/mess/feedback", json=feedback_valid, headers=student_headers)
    assert fb_spam_res.status_code == 400
    assert "already reviewed" in fb_spam_res.json()["error"]
    print("✅ Happy path feedback submitted and anti-spam caught duplicate successfully.")

    print_step("39. POST /api/mess/optout (Happy Path OptOut Tomorrow)")
    optout_valid = {
        "date": tomorrow_str,
        "meal_type": "lunch"
    }
    oo_pass_res = requests.post(f"{BASE_URL}/mess/optout", json=optout_valid, headers=student_headers)
    assert oo_pass_res.status_code == 200
    
    oo_spam_res = requests.post(f"{BASE_URL}/mess/optout", json=optout_valid, headers=student_headers)
    assert oo_spam_res.status_code == 400
    print("✅ Happy path opt-out submitted and duplicate caught successfully.")

    print_step("40. DELETE /api/mess/optout (Cancel Flow)")
    oo_cancel_res = requests.delete(f"{BASE_URL}/mess/optout", json=optout_valid, headers=student_headers)
    assert oo_cancel_res.status_code == 200
    print("✅ User successfully cancelled their opt-out.")
    
    requests.post(f"{BASE_URL}/mess/optout", json=optout_valid, headers=student_headers)

    print_step("41. GET /api/admin/mess/analytics/today (Analytics Aggregation)")
    analytics_res = requests.get(f"{BASE_URL}/mess/analytics/today", headers=admin_headers)
    assert analytics_res.status_code == 200, analytics_res.text
    analytics_data = analytics_res.json()["data"]
    assert "today_average_ratings" in analytics_data
    assert "opt_outs_today_tomorrow" in analytics_data
    print("✅ Mess Analytics successfully aggregated.")

    print("\n[========== 🎉 ALL PHASE 5 TESTS PASSED SUCCESSFULLY 🎉 ==========]")
