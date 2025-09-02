import toast from 'react-hot-toast'

interface ToastConfig {
    duration?: number
    position?:
        | 'top-right'
        | 'top-center'
        | 'top-left'
        | 'bottom-right'
        | 'bottom-center'
        | 'bottom-left'
    style?: React.CSSProperties
    className?: string
    id?: string
}

export const useToast = () => {
    const success = (message: string, config?: ToastConfig) => {
        return toast.success(message, {
            duration: config?.duration || 4000,
            style: {
                background: '#1f2937',
                color: '#10b981',
                border: '1px solid #10b981',
                borderRadius: '8px',
                fontSize: '14px',
                padding: '12px 16px',
                maxWidth: '400px',
            },
            iconTheme: {
                primary: '#10b981',
                secondary: '#1f2937',
            },
            ...config,
        })
    }

    const error = (message: string, config?: ToastConfig) => {
        return toast.error(message, {
            duration: config?.duration || 5000,
            style: {
                background: '#1f2937',
                color: '#ef4444',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                fontSize: '14px',
                padding: '12px 16px',
                maxWidth: '400px',
            },
            iconTheme: {
                primary: '#ef4444',
                secondary: '#1f2937',
            },
            ...config,
        })
    }

    const loading = (message: string, options?: { id?: string }) => {
        return toast.loading(message, {
            style: {
                background: '#1f2937',
                color: '#f9fafb',
                border: '1px solid #6b7280',
                borderRadius: '8px',
                fontSize: '14px',
                padding: '12px 16px',
                maxWidth: '400px',
            },
            id: options?.id,
        })
    }

    const info = (message: string, config?: ToastConfig) => {
        return toast(message, {
            duration: config?.duration || 4000,
            icon: 'ℹ️',
            style: {
                background: '#1f2937',
                color: '#3b82f6',
                border: '1px solid #3b82f6',
                borderRadius: '8px',
                fontSize: '14px',
                padding: '12px 16px',
                maxWidth: '400px',
            },
            ...config,
        })
    }

    const warning = (message: string, config?: ToastConfig) => {
        return toast(message, {
            duration: config?.duration || 4000,
            icon: '⚠️',
            style: {
                background: '#1f2937',
                color: '#f59e0b',
                border: '1px solid #f59e0b',
                borderRadius: '8px',
                fontSize: '14px',
                padding: '12px 16px',
                maxWidth: '400px',
            },
            ...config,
        })
    }

    const dismiss = (toastId?: string) => {
        if (toastId) {
            toast.dismiss(toastId)
        } else {
            toast.dismiss()
        }
    }

    const promise = <T>(
        promise: Promise<T>,
        {
            loading: loadingMessage,
            success: successMessage,
            error: errorMessage,
        }: {
            loading: string
            success: string | ((data: T) => string)
            error: string | ((err: unknown) => string)
        }
    ) => {
        return toast.promise(
            promise,
            {
                loading: loadingMessage,
                success: successMessage,
                error: errorMessage,
            },
            {
                style: {
                    background: '#1f2937',
                    color: '#f9fafb',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    fontSize: '14px',
                    padding: '12px 16px',
                    maxWidth: '400px',
                },
                success: {
                    iconTheme: {
                        primary: '#10b981',
                        secondary: '#1f2937',
                    },
                },
                error: {
                    iconTheme: {
                        primary: '#ef4444',
                        secondary: '#1f2937',
                    },
                },
            }
        )
    }

    return {
        success,
        error,
        loading,
        info,
        warning,
        dismiss,
        promise,
    }
}


