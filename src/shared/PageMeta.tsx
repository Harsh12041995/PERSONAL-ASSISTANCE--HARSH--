import { FC } from "react";

interface PageMetaProps {
    title?: string;
    description?: string;
}

const PageMeta: FC<PageMetaProps> = () => {
    // Purely for SEO/Tab title - but for now just a stub to fix the build
    return null;
};

export default PageMeta;
