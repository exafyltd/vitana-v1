-- Fix mis-tagged diary entries: update Maxina Experience entries from "general" to "business-projects"
UPDATE diary_entries 
SET tags = ARRAY['business-projects', 'diary'] 
WHERE id IN ('f6884a48-3e44-4c91-9a5d-2fc9f143deec', '24b0b595-6d8f-40aa-b511-677da86baf4a');