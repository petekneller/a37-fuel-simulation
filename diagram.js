window.app = function() {

  const SIM_SCALING_FACTOR = 4; // the frequency of sim loops
  const FUEL_LINE_COLOUR = '#36d4dc';

  /* Runtime */

  const state = {
    powerSetting: 0
  };

  const throttlePosition = () =>
    document.getElementById('throttle').valueAsNumber;

  const engineCanRun = () => true;

  const engineIsRunning = () => state.powerSetting > 0;

  const updateSimulation = () => {
    state.powerSetting = engineCanRun() ? throttlePosition() : 0;
  };

  const renderPump = (pumpName, isOn) => {
    document.
      querySelector(`g[name="${pumpName}"] g[name="impeller"] animateTransform`).
      setAttribute('to', isOn ? '60' : '0');

    document.
      querySelector(`g[name="${pumpName}"] rect[name="background"]`).
      style.setProperty('fill', isOn ? FUEL_LINE_COLOUR : 'white');
  };

  const renderEngines = () => {
    // To show or not the heat gradient in the engine
    document.querySelectorAll('linearGradient[name="engine"] stop').forEach(stop =>
      stop.style.setProperty('stop-opacity', engineIsRunning() ? '1' : '0')
    );

    // The level of heat in the engine
    // Hue runs from 1 (cold end) to 56
    const hue = Math.round(1 + (55 * state.powerSetting / 100));
    // Lightness runs from 42 (cold end) to 50
    const lightness = Math.round(42 + (8 * state.powerSetting / 100));
    const color = `hsl(${hue}, 90%, ${lightness}%)`;
    document.
      querySelector('linearGradient[name="engine"] stop[name="hot"]').
      style.setProperty('stop-color', color);

    // Rotating compressor
    document.
      querySelector('pattern[name="compressor"] animate').
      setAttribute('to', engineIsRunning() ? '4' : '0');

    // Fuel pumps
    renderPump('pumpEngineLeft', engineIsRunning());
    renderPump('pumpEngineRight', engineIsRunning());

    // Fuel lines
    document.
      querySelector('path[name="fuelLineFuselageToEngine"]').
      style.setProperty('fill', engineIsRunning() ? FUEL_LINE_COLOUR : 'white');

    // Fuel flow gauge
    document.
      querySelectorAll('g[name="gaugeFuelFlow"] path[name="indicator"]').
      forEach(indicator => {
        indicator.style.setProperty('transform-box', 'fill-box');
        indicator.style.setProperty('transform-origin', 'center');
        indicator.style.setProperty('transform', `rotate(${210 * state.powerSetting / 100}deg)`);
      });
  };

  const renderUI = () => {
    renderEngines();
  };

  const runSimulation = () => {
    updateSimulation();
    renderUI();
  };

  /* end runtime */

  /* Event handlers */

  const throttleChangedHandler = () => {
  };

  /* end event handlers */

  /* Initialisation */

  const addEventHandlers = () => {
    document.getElementById('throttle').oninput = throttleChangedHandler;
  };

  const initSimulation = () => {
  };

  const initUI = () => {
  };

  const init = () => {
    console.log('initing');
    addEventHandlers();
    initSimulation();
    initUI();
    window.setInterval(runSimulation, 1000 / SIM_SCALING_FACTOR);
  };

  /* end initialisation */

  return {
    init
  };

}();

window.onload = function() {
  app.init();
};
