import { ArgumentsHost, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

function mockHost(url = '/api/v1/test') {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  let loggerError: jest.SpyInstance;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    loggerError = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('passes through status and message for HttpException', () => {
    const { host, status, json } = mockHost();
    filter.catch(new NotFoundException('Widget 1 not found'), host);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 404, detail: 'Widget 1 not found' }),
    );
  });

  it('joins array messages from validation errors', () => {
    const { host, json } = mockHost();
    filter.catch(new BadRequestException(['a is required', 'b is required']), host);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ detail: 'a is required; b is required' }),
    );
  });

  it('does not leak internal error details for unhandled exceptions', () => {
    const { host, status, json } = mockHost();
    filter.catch(new Error('connect ECONNREFUSED db:5432 password=hunter2'), host);
    expect(status).toHaveBeenCalledWith(500);
    const body = json.mock.calls[0][0];
    expect(body.detail).toBe('An unexpected error occurred');
    expect(JSON.stringify(body)).not.toContain('hunter2');
  });

  it('logs unhandled exceptions server-side', () => {
    const { host } = mockHost();
    filter.catch(new Error('boom'), host);
    expect(loggerError).toHaveBeenCalled();
  });

  it('does not log ordinary HttpExceptions', () => {
    const { host } = mockHost();
    filter.catch(new NotFoundException('nope'), host);
    expect(loggerError).not.toHaveBeenCalled();
  });
});
