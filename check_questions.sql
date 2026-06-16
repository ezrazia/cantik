-- Check loop configurations in questions
SELECT id, label, validation 
FROM form_questions 
WHERE blok_id IN (SELECT id FROM form_bloks WHERE kegiatan_id = 1)
AND validation LIKE '%loop%'
LIMIT 20;
