import { mount } from 'svelte';
import App from './App.svelte';
import './app.css';
import { initialiseApp } from './bootstrap';

initialiseApp(document.getElementById('app'), (target) => {
  mount(App, { target });
});
