import React from 'react';

function SettingsSidebar({ menuItems, activeTab, onTabChange }) {
  return (
    <div className="ps-sidebar w-full border-b border-[#e6e6e6] bg-white lg:w-[440px] lg:flex-shrink-0 lg:border-b-0 lg:border-r">
      <div className="border-b border-[#e6e6e6] px-6 py-5">
        <h1 className="text-[38px] font-black leading-none text-[#1e1e1e]">
          Settings
        </h1>
      </div>

      {menuItems.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onTabChange(item.id)}
          className={`flex w-full items-start gap-4 border-b border-[#e6e6e6] px-6 py-5 text-left transition-colors ${
            activeTab === item.id ? 'bg-[#f5f5f5]' : 'bg-white hover:bg-[#fafafa]'
          }`}
        >
          <div className="mt-0.5 flex-shrink-0">{item.icon}</div>

          <div>
            <p className="text-[16px] font-bold text-[#1e1e1e]">
              {item.label}
            </p>

            <p className="mt-1 text-[14px] leading-snug text-[#636363]">
              {item.description}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

export default SettingsSidebar;