# College Management System: Roles, Permissions and Access Control

Document 2 of 3 | Version 1.0 | October 2026 | Status: planning, nothing built yet

## 1. Core concepts

| Term | Meaning |
| --- | --- |
| Resource | A thing in the system, such as complain, timetable, gate\_pass |
| Action | Something you can do to a resource, such as create, resolve, approve |
| Permission | One resource and action pair, written as resource.action, for example complain.resolve |
| Scope | How much data the permission reaches: OWN, LINKED, DEPARTMENT or ALL |
| Role | A named bundle of permissions with a scope on each |

Every exposed action in the backend has one permission code. Before the action runs, the backend checks that the user's role holds the code. If not, the request is denied and logged.

### 1.1 Scope values

| Scope | Meaning | Example |
| --- | --- | --- |
| OWN | Only records the user owns | A student views only their own profile |
| LINKED | Records of the linked student | A parent views the child's attendance |
| DEPARTMENT | Records in the user's department | A HOD lists complaints of their department |
| ALL | Every record | Admin lists all profiles |

The scope makes separate codes like view\_own and view\_all unnecessary. One code, profile.view, gives different reach per role.

## 2. Tables

| Table | Columns |
| --- | --- |
| permissions | id, code (unique), resource, action, description, created\_at |
| role\_permissions | role\_id FK, permission\_id FK, scope ENUM(OWN, LINKED, DEPARTMENT, ALL). Primary key is role\_id plus permission\_id |
| roles | See document 1 (code, name, profile\_type, is\_system, is\_assignable, status) |
| audit\_logs | See document 1 |

Permissions are created by the code, not by users. A seed script reads the permission list from the shared file and inserts any missing rows. Roles and role\_permissions are edited from the admin panel.

Optional later: a user\_permission\_overrides table (user\_id, permission\_id, effect ALLOW or DENY, expires\_at) for rare one-person exceptions. It is not needed at the start because custom roles like HOD cover the common cases.

## 3. Rules for permission codes

1. Format is resource.action in lower case with underscores, for example gate\_pass.approve\_long.
2. manage on a resource includes every other action of that resource.
3. list includes view.
4. A permission never grants more than its scope.
5. If a user holds a permission through more than one path, the widest scope wins.
6. A code is never renamed after release. Add a new one and retire the old.
7. Every new endpoint must name its permission. A missing guard fails the build (see the test rules in section 9).

## 4. Permission catalog

The pattern for profile resources is repeated for each profile type.

| Resource | Actions |
| --- | --- |
| user\_profile, student\_profile, faculty\_profile, staff\_profile, parent\_profile | view, list, create, edit, delete, manage |
| user | list, view, suspend, restore, change\_role, manage |
| role\_application | create, view, list, review, manage |
| role | list, view, create, edit, delete, manage\_permissions |
| course, department, subject, class\_group | view, list, create, edit, delete |
| complain | create, view, list, resolve, delete |
| notice | view, list, create, edit, delete, publish |
| timetable | list, create, edit, delete |
| attendance | mark, view, list, edit, report |
| gate\_pass | request\_short, request\_long, approve\_short, approve\_long, view, list, cancel, mark\_exit, mark\_return |
| document | apply, view, list, upload\_template, create\_type, approve, issue, delete |
| placement | view, list, create, edit, delete, apply, view\_applicants |
| map | view, edit, manage |
| ai\_assistant | use, manage |
| system\_setting | view, manage |
| notification | send\_broadcast |
| audit\_log | view, list |

Notes:

- edit on complain means resolve in plain words. The code is complain.resolve so the meaning is clear.
- Silent mode is a personal preference. It needs no permission because every logged-in user controls only their own setting. The college can switch the whole feature off with a system setting (see document 3).
- Short and long gate passes have separate request and approve codes so each can have different approvers.

## 5. Default roles

The table shows the starting setup. Admin can change any row except for the protected rules in section 8.

| Role | Main permissions (scope) |
| --- | --- |
| BASE | role\_application.create (OWN), role\_application.view (OWN), user\_profile.view and edit (OWN). Nothing else |
| ADMIN | All permissions (ALL) |
| STUDENT | student\_profile.view and edit (OWN), complain.create and view (OWN), notice.view and list (ALL), timetable.list (OWN), attendance.view (OWN), gate\_pass.request\_short, request\_long, view and cancel (OWN), document.apply and view (OWN), placement.view, list and apply (OWN), map.view, ai\_assistant.use |
| FACULTY | faculty\_profile.view and edit (OWN), student\_profile.list (DEPARTMENT), complain.create and view (OWN), notice.view and list, timetable.list (OWN), attendance.mark, view and report (OWN classes), document.apply and view (OWN), map.view, ai\_assistant.use |
| STAFF | staff\_profile.view and edit (OWN), complain.create and view (OWN), notice.view and list, document.apply and view (OWN), map.view, ai\_assistant.use |
| PARENT | parent\_profile.view and edit (OWN), student\_profile.view (LINKED), attendance.view (LINKED), notice.view and list, gate\_pass.view (LINKED), complain.create and view (OWN), map.view |

## 6. Roles you will add later from the admin panel

These need no code change. Admin builds each one in the role editor.

| Role | profile\_type | How to build it |
| --- | --- | --- |
| HOD | FACULTY | Clone FACULTY. Add timetable.create, edit, delete (DEPARTMENT), attendance.list and edit (DEPARTMENT), student\_profile.list (DEPARTMENT), complain.list (DEPARTMENT), gate\_pass.approve\_short and approve\_long (DEPARTMENT), document.approve (DEPARTMENT), placement.view\_applicants (DEPARTMENT) |
| WARDEN | STAFF | Clone STAFF. Add gate\_pass.approve\_short, approve\_long, list (hostel students), complain.list and resolve (hostel category) |
| SECURITY | STAFF | Clone STAFF. Add gate\_pass.view, gate\_pass.mark\_exit, gate\_pass.mark\_return |
| PLACEMENT\_OFFICER | STAFF | Clone STAFF. Add placement.create, edit, delete, list, view\_applicants, notice.create (placement) |
| EXAM\_OFFICER, LIBRARIAN and others | as needed | Same method |

### 6.1 Making someone a HOD

1. Create the HOD role once (steps in the table above).
2. For an existing faculty member, admin uses user.change\_role to switch FACULTY to HOD. Both roles use faculty\_profiles, so the profile row is kept.
3. Admin sets departments.hod\_user\_id to that user.
4. The user gets the new permissions on their next request.

If the new role has a different profile\_type than the old one, the user must apply again so the right profile data is collected.

## 7. Runtime permission check

```
@RequirePermission('complain.resolve')
resolve(id):
  ctx   = request context (user, status, role, department_id)
  scope = ctx.scopeOf('complain.resolve')   // OWN, LINKED, DEPARTMENT, ALL or none
  if scope is none: deny (403) and write audit row
  row   = repository.findScoped(id, scope, ctx)
  if row is missing: respond 404 (do not reveal that it exists)
  run action in a transaction
  write audit row
```

### 7.1 Steps

1. Verify the token and load the user.
2. Check status: SUSPENDED users are blocked from everything except login and reading the suspension note. System maintenance mode blocks all but ADMIN.
3. Look up the permission code in the role's permission map.
4. Expand implied codes: resource.manage covers all actions, list covers view.
5. Read the scope and pass it to the repository so the query itself filters the rows.
6. Run the action and log the result.

### 7.2 Request context

Loaded for each request and cached for a short time: user id, status, role id, department\_id, course\_id, class\_group\_id and linked student id.

### 7.3 Caching

| Item | Rule |
| --- | --- |
| Role permission map | Cached in Redis by role id. Cleared whenever role\_permissions change |
| User status | Read on every request (never trust the token for status) |
| Token content | User id and role id only. Not the permission list, so changes apply right away |

### 7.4 Response codes

| Code | When |
| --- | --- |
| 401 | Not logged in or token invalid |
| 403 | Logged in but missing the permission, or user is suspended |
| 404 | Record not found or outside the user's scope |
| 503 | Maintenance mode for non-admins |

## 8. Safety rules for roles

1. System roles (BASE, ADMIN, FACULTY, STUDENT, PARENT, STAFF) cannot be deleted.
2. BASE can never be given more than the application and own-account permissions.
3. The last active ADMIN cannot be suspended, deleted or changed to another role.
4. An admin can only grant permissions they hold themselves.
5. Changing ADMIN permissions needs role.manage\_permissions and is always logged.
6. A role cannot be deleted while users hold it. Admin must move the users first.
7. All role and permission changes go to audit\_logs with before and after values.
8. Suspended users keep their role so the suspension can be lifted without data loss.

## 9. Admin panel for role management

| Screen | What it does |
| --- | --- |
| Role list | Shows roles, user counts, status. Buttons: create, clone, deactivate |
| Role editor | A grid with resources as rows and actions as columns. Each cell is off or a scope dropdown |
| Role compare | Shows the difference between two roles (useful for HOD vs FACULTY) |
| User role change | Search a user and change role with a reason |
| Audit view | Who changed which permission and when |

### 9.1 Testing rules

- A test lists every route in the app and fails if any route has no permission guard.
- A matrix test runs every route with every default role and compares allow or deny with an expected table.
- Unit tests cover manage and list expansion, scope selection and suspended users.
- A test confirms that one user cannot read another user's data with OWN scope by changing the id in the URL.

## 10. Checklist for this document

Tick only when built, tested and merged.

- [ ] Permission code list written in one shared file
- [ ] permissions and role\_permissions tables migrated
- [ ] Seed script inserts all permission codes and default role mappings
- [ ] RequirePermission guard working
- [ ] manage and list expansion working
- [ ] Scope filters work for OWN, LINKED, DEPARTMENT and ALL
- [ ] Permission cache and cache clearing working
- [ ] Suspended and maintenance mode checks working
- [ ] Audit logs written for allowed and denied calls
- [ ] Role list, role editor and clone screens built
- [ ] user.change\_role flow built
- [ ] Safety rules in section 8 enforced and tested
- [ ] HOD role created from the admin panel and tested with a real faculty account
- [ ] Route coverage test and role matrix test passing
