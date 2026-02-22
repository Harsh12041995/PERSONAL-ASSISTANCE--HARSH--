import { createContext, useContext, useState, useEffect } from "react";

/**
 * Sidebar context type definition
 */
type SidebarContextType = {
  isExpanded: boolean;
  isMobileOpen: boolean;
  isHovered: boolean;
  activeItem: string | null;
  openSubmenu: string | null;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  setIsHovered: (isHovered: boolean) => void;
  setActiveItem: (item: string | null) => void;
  toggleSubmenu: (item: string) => void;
  closeSubmenu: () => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

/**
 * Hook to use sidebar context
 */
export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

/**
 * Sidebar Provider Component
 * Manages sidebar state including expansion, mobile view, and submenu states
 */
export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Sidebar state management
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  /**
   * Handle window resize for responsive behavior
   */
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // Close mobile sidebar when switching to desktop
      if (!mobile && isMobileOpen) {
        setIsMobileOpen(false);
      }
      
      // Auto-expand sidebar on desktop
      if (!mobile && !isExpanded) {
        setIsExpanded(true);
      }
    };

    // Initial check
    handleResize();
    
    // Add event listener
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isMobileOpen, isExpanded]);

  /**
   * Toggle sidebar expansion (desktop)
   */
  const toggleSidebar = () => {
    setIsExpanded((prev) => !prev);
  };

  /**
   * Toggle mobile sidebar
   */
  const toggleMobileSidebar = () => {
    setIsMobileOpen((prev) => !prev);
  };

  /**
   * Toggle submenu state
   */
  const toggleSubmenu = (item: string) => {
    setOpenSubmenu((prev) => (prev === item ? null : item));
  };

  /**
   * Close submenu
   */
  const closeSubmenu = () => {
    setOpenSubmenu(null);
  };

  return (
    <SidebarContext.Provider
      value={{
        isExpanded: isMobile ? false : isExpanded,
        isMobileOpen,
        isHovered,
        activeItem,
        openSubmenu,
        toggleSidebar,
        toggleMobileSidebar,
        setIsHovered,
        setActiveItem,
        toggleSubmenu,
        closeSubmenu,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};
