import { useToast } from '@/hooks/useToast'

export function ToastExamples() {
    const toast = useToast()

    return (
        <div className='space-y-4 p-4'>
            <h2 className='text-xl font-bold text-white'>Toast Examples</h2>

            <div className='flex flex-wrap gap-2'>
                <button
                    onClick={() =>
                        toast.success(
                            '🎉 Success! Operation completed successfully.'
                        )
                    }
                    className='px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700'
                >
                    Success Toast
                </button>

                <button
                    onClick={() =>
                        toast.error('❌ Error! Something went wrong.')
                    }
                    className='px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700'
                >
                    Error Toast
                </button>

                <button
                    onClick={() =>
                        toast.info(
                            'ℹ️ Info: Here is some important information.'
                        )
                    }
                    className='px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'
                >
                    Info Toast
                </button>

                <button
                    onClick={() =>
                        toast.warning('⚠️ Warning: Please be careful.')
                    }
                    className='px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700'
                >
                    Warning Toast
                </button>

                <button
                    onClick={() => {
                        const id = toast.loading('⏳ Processing...')
                        setTimeout(() => {
                            toast.dismiss(id)
                            toast.success('✅ Processing complete!')
                        }, 3000)
                    }}
                    className='px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700'
                >
                    Loading → Success
                </button>

                <button
                    onClick={() => {
                        void toast.promise(
                            new Promise((resolve, reject) => {
                                setTimeout(() => {
                                    if (Math.random() > 0.5) {
                                        resolve('Success!')
                                    } else {
                                        reject(new Error('Failed!'))
                                    }
                                }, 2000)
                            }),
                            {
                                loading: '🔄 Processing promise...',
                                success: '🎉 Promise resolved!',
                                error: '❌ Promise rejected!',
                            }
                        )
                    }}
                    className='px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700'
                >
                    Promise Toast
                </button>

                <button
                    onClick={() => toast.dismiss()}
                    className='px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900'
                >
                    Dismiss All
                </button>
            </div>
        </div>
    )
}
