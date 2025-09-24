import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import RouteInput from '../RouteInput';

describe('RouteInput', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  test('renders input fields and submit button', () => {
    render(<RouteInput onSubmit={mockOnSubmit} loading={false} />);
    
    expect(screen.getByLabelText(/start point/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end point/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate pace notes/i })).toBeInTheDocument();
  });

  test('disables submit button when inputs are empty', () => {
    render(<RouteInput onSubmit={mockOnSubmit} loading={false} />);
    
    const submitButton = screen.getByRole('button', { name: /generate pace notes/i });
    expect(submitButton).toBeDisabled();
  });

  test('enables submit button when inputs are filled', () => {
    render(<RouteInput onSubmit={mockOnSubmit} loading={false} />);
    
    const startInput = screen.getByLabelText(/start point/i);
    const endInput = screen.getByLabelText(/end point/i);
    const submitButton = screen.getByRole('button', { name: /generate pace notes/i });

    fireEvent.change(startInput, { target: { value: '40.748817,-73.985428' } });
    fireEvent.change(endInput, { target: { value: '40.758896,-73.985130' } });

    expect(submitButton).toBeEnabled();
  });

  test('calls onSubmit with trimmed values', () => {
    render(<RouteInput onSubmit={mockOnSubmit} loading={false} />);
    
    const startInput = screen.getByLabelText(/start point/i);
    const endInput = screen.getByLabelText(/end point/i);
    const submitButton = screen.getByRole('button', { name: /generate pace notes/i });

    fireEvent.change(startInput, { target: { value: '  40.748817,-73.985428  ' } });
    fireEvent.change(endInput, { target: { value: '  40.758896,-73.985130  ' } });
    fireEvent.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalledWith({
      start: '40.748817,-73.985428',
      end: '40.758896,-73.985130'
    });
  });

  test('shows loading state correctly', () => {
    render(<RouteInput onSubmit={mockOnSubmit} loading={true} />);
    
    expect(screen.getByText(/generating route/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/start point/i)).toBeDisabled();
    expect(screen.getByLabelText(/end point/i)).toBeDisabled();
  });
});
