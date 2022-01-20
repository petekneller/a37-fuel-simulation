Explore the simulation here: https://https://petekneller.github.io/a37-fuel-simulation/

This repo contains a moderate-fidelity simulation of the fuel system of a Cessna A-37 Dragonfly.

What? Why?

Well because the fuel systems of aircraft, especially military aircraft, are interesting. They're not like cars, or small boats, wherein you have a single fuel tank from which the engine/s just draw fuel. Aircraft often have multiple fuel tanks. Those tanks often have fuel drawn from them at different times in order to maintain aircraft balance. And sometimes managing which tank/s are active is the job of the pilot and sometimes its the job of the aircraft's computer system.

The [Cessna A-37](https://en.wikipedia.org/wiki/Cessna_A-37_Dragonfly) was a US Air Force jet trainer of the 1950s that later was beefed up and pressed into duty as a light combat aircraft in Vietnam and beyond. I find it interesting because it has a number of fuel tanks, some of which were drawn from automatically and some under the control of the pilot. Some years ago I stumbled across the flight manual [^fm] on the internet and more recently was re-reading it and decided it would be amusing to see what a simulation of the fuel system might look like. I've not done any research on this subject outside of reading the flight manual so where the manual was ambiguous I've made a guess (but I've tried to make it clear as to when I'm guessing and when the manual is authoritive).

Still reading? Great, let's get started...

First, turn on the battery switch (left click your mouse or tap your finger on the toggle to flip it to the other position). It'll look like this:
<img src="/doc_images/battery_on.png" width="50">

With the batteries connected to the electrical bus you'll see the _boost pump_ begin to operate. This is an electrically-driven, low-pressure pump that sits within the fuselage fuel tank (displayed in the centre of your screen).
<img src="/doc_images/boost_pump_on.png" width="50">
It's _not_ the primary driver of fuel from the tank to the engines - there are also pumps at the engines. The manual states that the boost pump helps to prevent high altitude engine surge and prime the engine pumps in the case that they run dry. The rotating symbol for the pump is sitting inside a box that has a blue background. In this simulation that colour represents fuel. You'll see there is a wide, vertical bar of that same colour just above the boost pump. That represents graphically the proportion of fuel left in the tank. Between the pump and the bar is a textual display of the mass of fuel (in pounds) in the tank. There is graphical and textual indicator for each independent fuel tank in the aircraft.

Back to that boost pump. It's sitting inside a fuel-coloured box to indicate that there is fuel in the tank to which it's connected and so is providing positive pressure. If the fuselage tank (the only one from which it draws) were to run dry then the background of the pump would turn white. This is the case for all the pumps in the simulation. In the case of the boost pump if it were to lose pressure you would also see the _boost pump warning light_ (<img src="/doc_images/boost_warning.png" width="50">) come on in the annunciator panel shown in the lower left of the display. Let's see that. The textual indicator for the fuselage fuel tank - the one reading "514 lbs" - click or tap on it. You'll see the text label turn into an edit box, with the current fuel quantity displayed. Type "0" and then the enter or tab keys (if you've a keyboard) or tap somewhere else on the screen if you're on a tablet. You should see the fuselage tank empty, the boost pump run dry and the boost warning light come on. You'll also happen to see the _fuel level low warning light_ come on, but let's return to that shortly. You're looking for this...
<img src="/doc_images/fuselage_dry.png" width="50">

You can interact the same way with any of the fuel tanks in the aircraft: click/tap on the text displaying the fuel level, adjust it and then enter/tab/tap away to change it. You can enter any value between 0 and the maximum capacity of said tank. Enter a value larger than the maximum capacity and it will be capped. Enter a negative number and the value will be taken as 0. Enter anything that's not a number and the simulation will ignore what you typed and stick with the existing level. Let's get rid of that boost warning light. Change the level in the fuselage tank so that it holds 100 pounds of fuel. You'll mostly see things return to how they were before you emptied the tank, except that the fuel level low warning light is still lit. The fuselage tank of the A-37 contains a float-type switch which, at different positions, turn on and off various pumps and warning lights. The fuel level low warning light is the first of these - we'll see the rest shortly. It's lit any time the level in the fuselage tank drops below 295 pounds (+/- 20 pounds). The fuselage tank is the only one from which fuel is drawn to feed the engines - the other tanks empty into the fuselage - so if the level drops that low then a problem has occurred feeding from the other tanks (potentially pilot error) or the other tanks are empty and the fuselage level is now critically low.

Right - let's get the engines turning. But before that you will want to top up the fuselage tank. I can never recall the capacity of any of the tanks so I use a little trick where I just type in a suitably large number (eg. 1000 pounds) and let the software cap the tank to its maximum capacity. Now, grab the throttle handles in the bottom centre of the screen with the mouse or your finger and drag them upwards to advance the throttles. You'll see the animated engines come alive, the engine-driven fuel pumps spin, the dual fuel flow gauges (one above each engine) indicate the rate at which fuel is being burnt[^ff], and the fuel lines between fuselage tank and each engine change to fuel-colour (indicating the flow of fuel). Obviously in the real world there's an elaborate engine startup sequence but that's not necessary for our purposes.

<img src="/doc_images/engines_on.png" width="50">






[^fm]: USAF Series A-37B Aircraft Flight Manual, T.O.1A-37B-1, 1971; do a quick google - there are many sources on the internet.
[^ff]: I'm unsure of the maximum fuel flow applicable to the A-37. The flight manual contains performance charts (with fuel flow) for various cruise profiles but nothing that indicates the rates at maximum thrust. So I've taken the higher values from the cruise charts and added a little more.
