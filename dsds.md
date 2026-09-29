| Who                  | Role         | Name              | Permission                                       |
| -------------------- | ------------ | ----------------- | ------------------------------------------------ |
| College owner        | Super Admin  | Chairman/Dev      | have full systems all round access               |
| All Department Owner | Admin        | Director          | Have all department access                       |
| Department Owner     | Head of Dept | HOD/Principal     | Have a single department access                  |
| Teaching Staff       | faculty      | Prof/ Dr/ Teacher | Class level permisssopn liek attendance          |
| Non- teach Staff     | staff        | Lab asst.         | Less pemission we will add stuff and assign them |
| Workers              | workers      | Sweeper, Gardener | Self data permission and                         |
| Student              | Student      | Student           | self data                                        |

Workers (need a better naming here)

All Department means -
`Academic Departments` - CSE, MECH, PHY, ELECTRICAL, MATH etc
`Administrative Departments` - FINANC, ADMINSTRATIVE, SECURITY, MANAGEMENT, MAINTENANCE etc
These are system role, andd can only be modified by Super admin, no other can edit that

Accest (virtual)

| Assect         | Example                                    | Permission           |
| -------------- | ------------------------------------------ | -------------------- |
| System Setting | Email, Mntnse mode, confgs                 | manage, view         |
| Roles          | Roles page                                 | manage, view         |
| Department     | CSE, Offring Cources, Config, Head of dept | Create, manage, view |
| Cource         | Btech, A cource is a offered by a dept.    | Create, manage, view |


Timetable Management -
Collection of students - Group (Section) - will have a faculty assigned - That faculty will have permission to mark attendance of those student according to the timetable management system.
Timetable maanagent will expose the permission which faculty have the permisssion to which section for what period. then approve for attendance
