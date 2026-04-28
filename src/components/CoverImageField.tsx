'use client';

import { useState } from 'react';

const MAX_BYTES = 5 * 1024 * 1024;

export function CoverImageField() {
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      input.setCustomValidity('');
      setError(null);
      return;
    }
    if (file.size > MAX_BYTES) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      const msg = `Selected file is ${mb} MB. Max upload size is 5 MB.`;
      input.setCustomValidity(msg);
      setError(msg);
    } else {
      input.setCustomValidity('');
      setError(null);
    }
  }

  return (
    <>
      <input
        type="file"
        name="coverImage"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        aria-describedby={error ? 'cover-image-error' : undefined}
        aria-invalid={error ? true : undefined}
        style={{ marginTop: '0.5rem' }}
      />
      {error && (
        <p
          id="cover-image-error"
          role="alert"
          style={{ margin: '0.5rem 0 0', color: '#f87171', fontSize: '0.9rem' }}
        >
          {error}
        </p>
      )}
    </>
  );
}
