import React from "react";

const OFI_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6905526da166967415597099/3c8ad4e27_ofi_logo_RGB2.jpg";

export function showOFISuccessToast(message, description) {
  const toastElement = document.createElement('div');
  toastElement.className = 'fixed top-4 right-4 z-[100] animate-in slide-in-from-top-full duration-300';
  
  toastElement.innerHTML = `
    <div class="bg-white rounded-xl shadow-2xl border-2 border-green-500 p-4 max-w-md">
      <div class="flex items-start gap-3">
        <div class="w-12 h-12 bg-gradient-to-br from-white to-gray-50 rounded-lg flex items-center justify-center p-2 border-2 border-green-500/30 flex-shrink-0">
          <img 
            src="${OFI_LOGO_URL}" 
            alt="OFI Logo"
            class="w-full h-full object-contain"
            onerror="this.src='https://www.ofi.com/favicon.ico'"
          />
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <svg class="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <p class="font-bold text-gray-900 text-sm">${message}</p>
          </div>
          ${description ? `<p class="text-xs text-gray-600 ml-7">${description}</p>` : ''}
        </div>
        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600 flex-shrink-0">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(toastElement);
  
  // Auto-remove após 4 segundos
  setTimeout(() => {
    toastElement.classList.add('animate-out', 'slide-out-to-right-full');
    setTimeout(() => {
      if (toastElement.parentNode) {
        toastElement.remove();
      }
    }, 300);
  }, 4000);
}