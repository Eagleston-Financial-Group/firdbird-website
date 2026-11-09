import { applications } from '../src/data/applications.js';

export function applicationFixture(path = '/contractors/plumbing') {
  const application = applications[path];
  const fields = { consent: true };
  for (const field of application.groups.flatMap(group => group.fields)) {
    if (!field.required) continue;
    fields[field.key] = field.type === 'multiselect' ? [field.options[0]]
      : field.type === 'select' ? field.options[0]
        : field.type === 'date' ? '2027-01-01'
          : field.type === 'email' ? 'firebird-qa@example.test'
            : field.type === 'tel' ? '555-010-0100'
              : field.type === 'number' ? '1'
                : field.key === 'zip' ? '85205'
                  : field.key === 'firstName' ? 'Synthetic'
                    : field.key === 'lastName' ? 'Test'
                      : 'Synthetic test value';
  }
  fields.additionalNotes = 'Automated verification — not a customer submission.';
  return { formType: `${application.kind}-${application.slug}`, pagePath: path, fields };
}
