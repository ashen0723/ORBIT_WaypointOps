import './styles/index.css';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(<App />);
}
