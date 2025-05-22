
"use client";

import type { ChangeEvent } from 'react';
import { useState, useRef, useEffect } from 'react';
import { jordanGovernorates } from '@/data/jordanGovernorates';
import styles from '@/styles/DropdownSearch.module.css';
import { Input } from '@/components/ui/input'; // Using ShadCN input for main display

interface DropdownSearchProps {
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  onSelect: (value: string) => void; // This is field.onChange from react-hook-form
  selectedValue?: string;             // This is field.value from react-hook-form
  dir?: 'rtl' | 'ltr';
  formItemId?: string; // For react-hook-form integration with FormLabel if used externally
  error?: boolean; // To style input if there's an error
}

export default function DropdownSearch({
  label,
  icon,
  placeholder,
  onSelect,
  selectedValue,
  dir = 'rtl',
  formItemId,
  error
}: DropdownSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredGovernorates = jordanGovernorates.filter(gov =>
    gov.displayNameAr.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedGovernorateObject = jordanGovernorates.find(
    gov => gov.value === selectedValue
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const mainInputDisplayValue = selectedGovernorateObject?.displayNameAr || '';

  return (
    <div className={`${styles.formGroup} ${styles.dropdownSearch} ${isOpen ? styles.active : ''}`} ref={dropdownRef} dir={dir}>
      {/* The FormLabel from react-hook-form/ShadCN will be used outside this component */}
      {/* <label htmlFor={formItemId} className={styles.label}>{label}</label> */}
      <div className={styles.inputIcon}>
        {icon}
        <Input // Using ShadCN Input for better styling consistency and accessibility from react-hook-form
          type="text"
          id={formItemId}
          value={mainInputDisplayValue}
          placeholder={placeholder}
          readOnly
          onClick={() => setIsOpen(!isOpen)}
          className={`${styles.input} ${error ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        />
      </div>
      
      {isOpen && (
        <div className={`${styles.dropdownMenu} ${isOpen ? styles.active : ''}`}>
          <div className={styles.searchBox}>
            <input
              type="text"
              placeholder="ابحث عن المحافظة..."
              value={searchTerm}
              onChange={handleInputChange}
              dir={dir}
              autoFocus
              className="w-full p-2 border border-border rounded bg-background text-foreground focus:ring-ring focus:border-ring" // Basic Tailwind for search input
            />
          </div>
          <div className={styles.dropdownItems}>
            {filteredGovernorates.length > 0 ? (
              filteredGovernorates.map(gov => (
                <div
                  key={gov.value}
                  className={`${styles.dropdownItem} ${selectedValue === gov.value ? styles.selected : ''}`}
                  onClick={() => {
                    onSelect(gov.value);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  role="option"
                  aria-selected={selectedValue === gov.value}
                >
                  {gov.displayNameAr}
                </div>
              ))
            ) : (
              <div className={`${styles.dropdownItem} text-muted-foreground`}>لا توجد نتائج</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
