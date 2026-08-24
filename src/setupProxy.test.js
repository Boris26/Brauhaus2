const mockProxyMiddleware = jest.fn();
const mockCreateProxyMiddleware = jest.fn(() => mockProxyMiddleware);

jest.mock('http-proxy-middleware', () => ({
    createProxyMiddleware: (...args) => mockCreateProxyMiddleware(...args),
}));

const setupProxy = require('./setupProxy');

describe('development API proxy', () => {
    it('forwards the complete /api namespace without rewriting paths or filtering methods', () => {
        const app = { use: jest.fn() };

        setupProxy(app);

        expect(app.use).toHaveBeenCalledWith('/api', mockProxyMiddleware);
        expect(mockCreateProxyMiddleware).toHaveBeenCalledWith(expect.objectContaining({
            target: 'https://192.168.178.72',
            changeOrigin: true,
            secure: false,
        }));

        const proxyOptions = mockCreateProxyMiddleware.mock.calls[0][0];
        expect(proxyOptions).not.toHaveProperty('pathRewrite');
        expect(proxyOptions).not.toHaveProperty('method');
    });
});
