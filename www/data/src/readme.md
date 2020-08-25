WebGazer ETRA2018 Dataset Extractor
===================================
2018-07-30
James Tompkin
james_tompkin@brown.edu - Any issues, email me.


This software takes the ETRA2018 dataset and creates CSV files for each video, containing per-frame WebGazer and Tobii values in normalized screen coordinates.
After extraction, this makes it simple and efficent to analyse the performance of WebGazer in your favourite _data science_ application.

Works with webgazer.js commit 968817befd4855a219d1d4f2b9fbf52236779a05

Requirements:
=============
- Python 3.x
    - tornado
    - pytz
    - numpy
    - opencV
- ffmpeg on PATH
- Chrome
- WebGazer ETRA2018 Dataset (James' version)
- A lot of disk space - 50GB+ for running on every video on every participant


Instructions:
=============
1. Download the dataset from 
>https://webgazer.cs.brown.edu/data/WebGazerETRA2018Dataset_Release20180420.zip
    Place the unzipped files in www/data/src/
2. Execute the Python webserver
> python webgazerExtractServer.py

3. Launch browser
> http://localhost:8000/webgazerExtractClient.html

4. Watch for outputs in ../FramesDataset/

   Contains:
    - Per participant
    - Per video
    - Every video frame in the dataset as a .png
    - CSV file containing a lot of useful metadata about each video frame
        - Frame file path
        - Frame number in video
        - Frame time (Unix milliseconds); only approximate at the millisecond level
        - Any mouse input since the previous frame; only approximate at the millisecond level
        - Any keyboard input since the previous frame; only approximate at the millisecond level
        - Tobii prediction closest in time; normalized to screen coordinates
        - WebGazer prediction; normalized to screen coordinates
        - CLMTracker positions for all 71 2D points
        - Eye features as extracted by WebGazer, 140 features

5. Watch a replay.

    As it processes, the system can show the interaction events against the screen recording. Note that only laptop participants have screen recording synchronization data, and only then are they roughly aligned. Use the text box to 'try some numbers' and find the sync offset. This varies per participant.

6. Write out screen recording videos with interactions overlaid.

    This uses OpenCV, and is a little flakey, but should work. It will slow down extraction a lot. There's a switch in the code to turn it on; let me know if it breaks (I haven't tested it in a while).


Options:
========
The software is currently set up to run on _only_ the two dot tests and the four typing videos. This can be changed by editing webgazerExtractServer.py - look out for 'filter' as a keyword in comments. Likewise, the software currently processes _all_ participants; again look for 'filter'.


Gotchas:
========
- At times, it might look like nothing is happening to the client. It is, just on the server. E.G., extracting video frames, loading interaction log/Tobii data.
- Never edit and save a CSV in Excel. It will format the numbers on reading it in, then save them out in the formatted form. E.G., the Unix timestamps are converted to standard form. : (
- It's pretty easy to spit out error in screen millimetres, but be careful to check which participant was on desktop and which on laptop for real-world measurement conversion from normalized screen coordinates.
- The CSV has one line per video frame. Sometimes, multiple interaction events happen within a video frame. As such, the interaction columns in the CSVs contain ordered lists, chronologically ordered in increasing time.
- New versions of webgazer.js with algorithm improvements will require recomputing from scratch. These scripts ship with a version of webgazer.js from a few months ago.


Possible improvements to the dataset:
=====================================
- Some of the log files don't have "recording stop" events for all videos.
- None of the WebM files are closed properly, which means that they have no length.
- webgazerExtractServer.py: Uses ffmpeg to find frame times within each video; it could write these out to metadata files _once_ for the whole dataset and distribute them.
- final_dot_test_locations.tsv files do not exist for each participant
- Change '*_writing.webm' to '*_typing.webm'
- Synchronize at all the screen recordings from the desktop PC.
- Synchronize all screen recordings accurately. Aaron had tried this with synchronizing the dot test video to the interaction logs, and by looking at which frame the on-screen clock changed at; talk to him.



Possible improvements to this software:
=======================================
- webgazerExtractServer.py: Uses ffmpeg to find frame times within each video; it could write these out to metadata files _once_ for the whole dataset and distribute them. This would remove the ffmpeg dependency.
- webgazerExtractServer.py: Make the screen recording replay video writer separate; this would simplify the code and remove the OpenCV dependency.
- Tobii gaze estimation is the closest instantaneous sample in time, but Tobii samples over that window could be averaged or even modeled as a distribution. This would reduce the overall error of WebGazer by approximately Tobii's stated error.
- Turn extraction into a mode; make the tool for general dataset replay (shouldn't be too much work; the basics are there already).
- Add participant selection / 'all participants' button for extraction


Possible improvements to WebGazer dataset collector software:
=============================================================
- There is a bug in the text input event logging: It pulls the value from the text field _before_ the effect of the press. I.E., user presses 'R', event records that text field contains "". User presses 'e', event records that text field contains "R". It also doesn't catch backspace key events. This software handles this bug for the possible recovery cases, but outputs 'Unknown' as the key pressed otherwise.
- Some of the log files don't have "recording stop" events for all videos.
- Screen recordings have no synchronization data.
- Screen recordings for laptop are 2x resolution of the screen. This dataset has recompressed these to the correct resolution to save space; originals are still in 'Main Dataset'.
- Some log files had their Tobii data not fully written to - the last line was broken (P_34 was manually fixed for this data).
- Frame timestamps in .webM files are wrong; many files have each second frame taking its timestamp from the previous frame.


Potential improvements to WebGazer:
===================================
- Initial black frames after video recording start cause problems with CLMTracker; WebGazer.js could check whether each frame is above a noise floor and not process otherwise.
- CLMTracker does not run to convergence on every video frame (when in 'video mode'), which means that the WebGazer output is not optimal and jitters unnecessarily. WebGazer could use any space CPU cycles above framerate to have the CLM tracker run more iterations.
- "a patchresponse was monotone, causing normalization to fail. Leaving it unchanged." error message should be fixable.
- In code, rename everything that was 'screen' to be 'client', e.g., 'mouseClient', as the values in these variables don't refer to screen coordinates but client coordinates.
- WebGazer does multiple identical image processing operations on the same pixels, which is wasteful.
