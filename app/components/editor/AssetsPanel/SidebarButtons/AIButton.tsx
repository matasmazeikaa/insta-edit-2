import Image from 'next/image';

export default function AIButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            className="bg-white border border-solid rounded border-transparent transition-colors flex flex-col items-center justify-center text-gray-800 hover:bg-[#ccc] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-auto py-2 px-2 sm:px-5 sm:w-auto"
            onClick={onClick}
        >
            <span className="text-xs">AI</span>
        </button>
    );
}