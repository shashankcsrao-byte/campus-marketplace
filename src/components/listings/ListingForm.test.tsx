import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ListingForm from './ListingForm';

const png = () => new File(['img'], 'photo.png', { type: 'image/png' });

describe('ListingForm', () => {
  it('blocks an empty form and explains every problem', async () => {
    const onSubmit = vi.fn();
    render(<ListingForm submitLabel="Publish listing" onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Publish listing' }));

    expect(onSubmit).not.toHaveBeenCalled();
    for (const msg of ['Add at least one photo.', 'Title is required.', 'Description is required.', 'Price is required.', 'Choose a category.', 'Choose the condition.'])
      expect(screen.getByText(msg)).toBeInTheDocument();
  });

  it('submits trimmed values including condition', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ListingForm submitLabel="Publish listing" onSubmit={onSubmit} />);

    await user.upload(screen.getByLabelText('Photos'), png());
    await user.type(screen.getByLabelText('Title'), '  Hero Sprint cycle  ');
    await user.type(screen.getByLabelText('Description'), 'Two years old, new brakes, rides well.');
    await user.type(screen.getByLabelText('Price (₹)'), '2800');
    await user.selectOptions(screen.getByLabelText('Category'), 'Vehicles');
    await user.click(screen.getByRole('radio', { name: /^Used/ }));
    await user.click(screen.getByRole('button', { name: 'Publish listing' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const [input, images] = onSubmit.mock.calls[0];
    expect(input).toEqual({
      title: 'Hero Sprint cycle',
      description: 'Two years old, new brakes, rides well.',
      price: 2800,
      category: 'Vehicles',
      condition: 'used',
      location_name: null,
      latitude: null,
      longitude: null,
    });
    expect(images).toHaveLength(1);
  });

  it('shows the server error and lets the user try again', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue({ code: 'P0001', message: 'RATE_LIMIT_LISTINGS' });
    render(
      <ListingForm
        submitLabel="Save changes"
        onSubmit={onSubmit}
        initial={{
          id: '1', seller_id: 'u', title: 'Desk lamp', description: 'LED lamp with 3 brightness levels.', price: 400,
          category: 'Hostel Essentials', condition: 'like_new', image_paths: ['u/1/0.webp'], status: 'available',
          location_name: null, latitude: null, longitude: null, created_at: '', updated_at: '',
        }}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/10 listings in the last 24 hours/);
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
  });
});
