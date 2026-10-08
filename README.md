# BloodTrack

Blood request and stock app for a hospital blood bank. Coursework for Vibe Coding, MBA (72 CH), SZABIST Islamabad.

Assignment 1: planning document and a frontend skeleton built in Lovable with mock data.

Assignment 2: GitHub sync, Supabase sign-up and sign-in, real database tables with Row Level Security, and live data in place of the mock data.

Built with Lovable (React, TypeScript, Tailwind) and Supabase.

Author: Sardar Shehryar Shabbir (24298)
Database: Supabase (Postgres), with Row Level Security so each user can only reach their own records.

## Status (Assignment 2)
- Sign up, sign in, sign out and protected pages working
- 8 tables in Supabase (profiles, wards, patients, blood_units, blood_requests, request_items, crossmatch_tests, issue_records), RLS on all
- All screens use live Supabase data
- Tested with two accounts: User B cannot read or change User A's records
