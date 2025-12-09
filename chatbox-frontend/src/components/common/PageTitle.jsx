import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const PageTitle = ({ title }) => {
    const location = useLocation();

    useEffect(() => {
        document.title = title ? `T Private Place - ${title}` : `T Private Place`;
    }, [title, location]);

    return null;
};

export default PageTitle;