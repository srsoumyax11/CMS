import random
import requests
from .config import BASE_URL, print_step
from .state import state

def run_audience_groups_tests():
    student_headers = state.get("student_headers")
    student2_headers = state.get("student2_headers")
    admin_headers = state.get("admin_headers")
    dept_id = state.get("dept_id") or state.get("department_id")
    course_id = state.get("course_id")
    student_uuid = state.get("student_uuid")
    faculty_uuid = state.get("faculty_uuid")

    if not admin_headers or not student_headers:
        print("Skipping audience groups tests: auth headers not initialized in state")
        return

    rand_suffix = random.randint(1000, 9999)

    # -------------------------------------------------------------
    # 1. RBAC Tests: Students blocked from creating audience groups
    # -------------------------------------------------------------
    print_step("54. POST /api/audience-groups (RBAC & Creation)")
    group_payload = {
        "name": f"BTech CSE Batch {rand_suffix}",
        "description": "All enrolled BTech CSE students for notifications",
        "filter_rules": {
            "course_id": course_id,
            "department_id": dept_id,
            "user_types": "student"
        }
    }

    res_unauth = requests.post(f"{BASE_URL}/audience-groups", headers=student_headers, json=group_payload)
    assert res_unauth.status_code == 403, f"Expected 403 for student creating audience group, got {res_unauth.status_code}"
    print("✅ RBAC passed: Student blocked from creating audience group (403).")

    # Admin creates group with filter rules
    res_create = requests.post(f"{BASE_URL}/audience-groups", headers=admin_headers, json=group_payload)
    assert res_create.status_code in [200, 201], f"Failed to create audience group: {res_create.text}"
    group_data = res_create.json()["data"]
    group_id = group_data["id"]
    assert group_data["name"] == group_payload["name"]
    assert group_data["member_count"] >= 1, f"Expected at least 1 filtered member, got {group_data['member_count']}"
    print(f"✅ Admin created audience group: '{group_data['name']}' with {group_data['member_count']} initial filtered members.")

    # Duplicate name validation
    res_dup = requests.post(f"{BASE_URL}/audience-groups", headers=admin_headers, json=group_payload)
    assert res_dup.status_code == 400, "Expected 400 for duplicate audience group name"
    print("✅ Validation passed: Duplicate group name rejected (400).")

    # -------------------------------------------------------------
    # 2. List & Detail Endpoints
    # -------------------------------------------------------------
    print_step("55. GET /api/audience-groups & GET /api/audience-groups/{id}")
    res_list = requests.get(f"{BASE_URL}/audience-groups", headers=admin_headers)
    assert res_list.status_code == 200
    groups_list = res_list.json()["data"]
    assert any(g["id"] == group_id for g in groups_list), "Created group not found in list"
    print(f"✅ Listed audience groups successfully ({len(groups_list)} groups).")

    res_detail = requests.get(f"{BASE_URL}/audience-groups/{group_id}", headers=admin_headers)
    assert res_detail.status_code == 200
    detail_data = res_detail.json()["data"]
    assert detail_data["id"] == group_id
    assert detail_data["member_count"] >= 1
    print(f"✅ Fetched audience group details successfully.")

    # -------------------------------------------------------------
    # 3. List Members & Discrepancy Calculation
    # -------------------------------------------------------------
    print_step("56. GET /api/audience-groups/{id}/members (Member List & Filter Match)")
    res_members = requests.get(f"{BASE_URL}/audience-groups/{group_id}/members", headers=admin_headers)
    assert res_members.status_code == 200
    members = res_members.json()["data"]
    assert len(members) >= 1
    # Check that initial members match filter
    assert all(m["matches_filter"] is True for m in members if not m["added_manually"])
    print(f"✅ Retrieved {len(members)} group members. Dynamic filter match verified.")

    # -------------------------------------------------------------
    # 4. Manual Add Member (e.g. Faculty or special student)
    # -------------------------------------------------------------
    print_step("57. POST /api/audience-groups/{id}/members (Manual Member Addition)")
    if faculty_uuid:
        res_add = requests.post(
            f"{BASE_URL}/audience-groups/{group_id}/members",
            headers=admin_headers,
            json={"user_ids": [faculty_uuid]}
        )
        assert res_add.status_code == 200
        print(f"✅ Manually added faculty member to student audience group.")

        # Verify added member shows added_manually=True and matches_filter=False
        res_members_after = requests.get(f"{BASE_URL}/audience-groups/{group_id}/members", headers=admin_headers)
        members_after = res_members_after.json()["data"]
        manual_member = next((m for m in members_after if m["user_id"] == faculty_uuid), None)
        assert manual_member is not None, "Manually added member not found in list"
        assert manual_member["added_manually"] is True
        assert manual_member["matches_filter"] is False, "Faculty should not match student-only filter"
        print("✅ Discrepancy flag verified: Manual member has added_manually=True and matches_filter=False.")

    # -------------------------------------------------------------
    # 5. Re-apply / Sync Filter (keeps manual members by default)
    # -------------------------------------------------------------
    print_step("58. POST /api/audience-groups/{id}/reapply-filter (Filter Sync)")
    res_reapply = requests.post(
        f"{BASE_URL}/audience-groups/{group_id}/reapply-filter",
        headers=admin_headers,
        json={"keep_manual": True}
    )
    assert res_reapply.status_code == 200
    reapply_data = res_reapply.json()["data"]
    assert reapply_data["new_count"] >= 1
    print(f"✅ Filter re-applied successfully. New member count: {reapply_data['new_count']}")

    # Verify manual member was preserved
    if faculty_uuid:
        res_members_reapply = requests.get(f"{BASE_URL}/audience-groups/{group_id}/members", headers=admin_headers)
        members_reapply = res_members_reapply.json()["data"]
        assert any(m["user_id"] == faculty_uuid for m in members_reapply), "Manual member was improperly deleted"
        print("✅ Preservation verified: Manual member preserved after filter sync.")

    # -------------------------------------------------------------
    # 6. Notice Targeting via Audience Group
    # -------------------------------------------------------------
    print_step("59. Notice Targeting via Audience Group")
    notice_title = f"Exclusive Announcement for Group {rand_suffix}"
    notice_res = requests.post(
        f"{BASE_URL}/notices",
        headers=admin_headers,
        data={
            "title": notice_title,
            "content": "This notice is exclusively targeted to our audience group members.",
            "target_audience_group_id": group_id
        }
    )
    assert notice_res.status_code == 200, f"Failed to create notice with audience group: {notice_res.text}"
    notice_id = notice_res.json()["data"]["id"]
    print(f"✅ Notice created with target_audience_group_id: {notice_id}")

    # Student 1 (who is a member of the group) fetches their notice feed
    res_feed = requests.get(f"{BASE_URL}/notices", headers=student_headers)
    assert res_feed.status_code == 200
    feed_items = res_feed.json()["data"]["items"]
    assert any(n["id"] == notice_id for n in feed_items), "Group notice not found in member student feed"
    print("✅ Member Student saw the group-targeted notice in their feed.")

    # Verify Student can view single notice
    res_single = requests.get(f"{BASE_URL}/notices/{notice_id}", headers=student_headers)
    assert res_single.status_code == 200
    print("✅ Member Student successfully viewed the group-targeted notice.")

    # -------------------------------------------------------------
    # 7. Remove Member & Verify Access Revocation
    # -------------------------------------------------------------
    print_step("60. DELETE /api/audience-groups/{id}/members/{user_id} (Revocation)")
    if faculty_uuid:
        res_del_member = requests.delete(
            f"{BASE_URL}/audience-groups/{group_id}/members/{faculty_uuid}",
            headers=admin_headers
        )
        if res_del_member.status_code != 200:
            print(f"FAILED TO DELETE MEMBER: {res_del_member.status_code} {res_del_member.text}")
        assert res_del_member.status_code == 200, f"Delete failed: {res_del_member.status_code} {res_del_member.text}"
        print("✅ Manually removed faculty member from audience group.")

