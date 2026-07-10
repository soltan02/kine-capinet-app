-- Adds the clinic's real service types (fracture/surgery rehab, joint &
-- muscle pain, acupuncture, cupping, leech therapy, bloodletting,
-- relaxation massage) to the appointments.type CHECK constraint, alongside
-- the existing generic stage labels (kept for backward compatibility with
-- existing records).

ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_type_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_type_check CHECK (type IN (
  'initial', 'session', 'assessment', 'discharge',
  'fracture_surgery', 'joint_muscle_pain', 'acupuncture', 'cupping',
  'leech_therapy', 'bloodletting', 'relaxation_massage'
));
