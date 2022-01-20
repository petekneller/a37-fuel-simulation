Explore the simulation here: https://https://petekneller.github.io/a37-fuel-simulation/

This repo contains a moderate-fidelity simulation of the fuel system of a Cessna A-37 Dragonfly.

What? Why?

Well because the fuel systems of aircraft, especially military aircraft, are interesting. They're not like cars, or small boats, wherein you have a single fuel tank from which the engine/s just draw fuel. Aircraft often have multiple fuel tanks. Those tanks often have fuel drawn from them at different times in order to maintain aircraft balance. And sometimes managing which tank/s are active is the job of the pilot and sometimes its the job of the aircraft's computer system.

The [Cessna A-37](https://en.wikipedia.org/wiki/Cessna_A-37_Dragonfly) was a US Air Force jet trainer of the 1950s that later was beefed up and pressed into duty as a light combat aircraft in Vietnam and beyond. I find it interesting because it has a number of fuel tanks, some of which were drawn from automatically and some under the control of the pilot. Some years ago I stumbled across the flight manual [^fm] on the internet and more recently was re-reading it and decided it would be amusing to see what a simulation of the fuel system might look like. I've not done any research on this subject outside of reading the flight manual so where the manual was ambiguous I've made a guess (but I've tried to make it clear as to when I'm guessing and when the manual is authoritive).

Still reading? Great, let's get started...

First, turn on the battery switch (click or tap on the toggle to flip it to the other position). It'll look like this: <img src="/doc_images/battery_on.png" width="50">

With the batteries connected to the electrical bus the 'boost pump' will operate. This is an electrically-driven, low-pressure pump that sits within the fuselage fuel tank (displayed in the centre of your screen). It's _not_ the primary driver of fuel from the tank to the engines - there are also pumps at the engines. The manual states that the boost pump helps to prevent high altitude engine surge and prime the engine pumps in the case that they run dry.





[^fm]: USAF Series A-37B Aircraft Flight Manual, T.O.1A-37B-1, 1971; do a quick google - there are many sources on the internet.
