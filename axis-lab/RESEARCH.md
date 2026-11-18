# AXIS LAB | Decision research

Research conducted November 18, 2026. Each pass produced a finding and changed the direction of the next. Creator posts are anecdotal signals, not representative survey data. Tool specifications change and should be checked with their providers.

## Internal audit (before external research)

- **Creator:** Bogdan, a filmmaker with 12+ years of cinematography, editing, sound, color, FPV and stunt-production experience. His distinctive teaching advantage is production craft, not access to a particular AI model.
- **Members:** Beginners, filmmakers, agency owners, marketers and content creators. They want repeatable cinematic workflows and client-ready results, not just impressive isolated clips.
- **Community goals:** Grow with qualified members, retain them through useful practical tools, strengthen the positioning around cinematic AI work, and create more valuable client outcomes.
- **Hypothesized gaps:** Model-independent scene planning, an easy way to teach intentional coverage, continuity decisions, finishing QC and reliable client handoffs.
- **Constraint:** Standalone tool that can ship as a finished static app without changing the current website.

## Ten sequential research passes

1. **Continuity complaints:** A recent r/aivideomaking discussion argues that consistent faces still leave broken environment and action continuity. **Direction change:** include world geography rather than a character-identity prompt pack. Source: https://www.reddit.com/r/aivideomaking/comments/1xcr0vr/character_continuity_is_more_than_a_consistent/
2. **Long-form workflows:** A working creator traces a feature-length project through character, scene and shot state. **Direction change:** produce independent, portable shot setups instead of a single prompt. Source: https://www.reddit.com/r/aivideomaking/comments/1xo7upe/how_im_handling_character_scene_consistency/
3. **Runway references:** Gen-4 references already address repeatable characters, settings and angles. **Direction change:** don't compete with model-native reference generation. Source: https://help.runwayml.com/hc/en-us/articles/40042718905875-Creating-with-Gen-4-Image-References
4. **Google Veo workflows:** Video prompting and image-to-video guidance give creators ways to steer generation, but planning decisions still sit outside the model. **Direction change:** export a model-independent brief users can transfer into any generation workflow. Sources: https://deepmind.google/models/veo/prompt-guide/ and https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/video/best-practice
5. **Creator education competitors:** Community and academy offerings often center on lessons, practice, challenges and critique. **Direction change:** prioritize a reusable hands-on utility over another course page. Sources: https://academy.runwayml.com/tutorial/gen-4-references and https://invideo.io/faq/what-are-the-best-communities-and-courses-for-learning/
6. **Existing free storyboard tools:** Wonder Unit's Storyboarder and other free storyboard apps already fill the general shot-planning category. **Direction change:** narrow the tool to spatial blocking and meaningful cuts, not a general-purpose storyboard editor. Sources: https://wonderunit.com/software/storyboarder/ and https://github.com/arnofaure/storyboard
7. **Film-language fundamentals:** The 180-degree rule, eyelines and continuity editing provide a clear physical decision framework. **Direction change:** let people drag a camera and experience a potential screen-direction reversal. Sources: https://open.library.okstate.edu/introfilmtv/part/editing/ and https://learnaboutfilm.com/film-language/sequence/180-degree-rule/
8. **Getting paid requires reliable delivery:** AI filmmaking discussions describe repeatable scene state and consistent output as important when work expands beyond individual clips. **Direction change:** include a production brief and review list that can be handed to collaborators or clients, not unsupported income claims. Sources: https://www.reddit.com/r/aifilmmaking/comments/1upsmlh/a_mistake_i_made_early_in_ai_filmmaking_was/ and https://www.reddit.com/r/aifilmmaking/comments/1wg1x7g/longform_ai_video_may_need_state_management/
9. **Free utility saturation:** Dedicated AI video cost calculators already exist and are easy to share. **Direction change:** avoid building another calculator or generic utility with little connection to Bogdan's production edge. Sources: https://anglr.co/tools/ai-video-cost-calculator and https://mcp.fxi.studio/ai-video-cost-calculator
10. **Finishing craft is still a complaint:** Film and editing creators criticize generic pacing, repetitive effects and missing sound texture in automated outputs. **Direction change:** keep the tool honest about what it cannot judge and export a human-facing checklist for sound, color and edit craft. Source: https://www.reddit.com/r/Filmmakers/comments/1xxhc29/getting_really_tired_of_people_pushing_ai_video/

The final direction was chosen only after considering all ten passes.

## Five candidate ideas

Editorial scores: 1 means weak, 10 means strong. These are internal judgments about usefulness, uniqueness, shareability and buildability in this session, not measurements of demand or conversion.

| Idea | Member value | Filmmaker edge | Shareability | Finish this session | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| **AXIS LAB: Interactive blocking and continuity director** | 9 | 10 | 9 | 9 | **37** |
| Shot Repair Triage: Edit versus regenerate decision guide | 8 | 9 | 9 | 10 | 36 |
| Client Scope Builder: Quote and revisions plan | 9 | 8 | 9 | 9 | 35 |
| Scene State Ledger: Tracking actors, props and environment | 10 | 9 | 8 | 7 | 34 |
| Sound Bridge Studio: Cut and sound-design exercises | 8 | 10 | 8 | 8 | 34 |

## Why AXIS LAB

The differentiator is to turn one of the most abstract filmmaking lessons, preserving screen direction across coverage, into a visible and practical interaction. It helps creators plan a sequence before spending time or generation credits, without relying on a single model or a paid API. The app can be completed as a lightweight static project, and the Markdown and JSON exports make its results usable elsewhere. The existing FRAMECHECK tool in this repository reviews the work after generation; AXIS LAB handles planning before generation.

## Claims and limits

- The community research is qualitative and does not prove a specific market size or demand score.
- The tool does not calculate real lens physics, generate reference stills, detect an actual video discontinuity or guarantee continuity.
- An axis crossing is a creative choice that may be intentionally motivated.
- No estimates of revenue, savings, model performance, real user counts or testimonials are used in the app.
- No existing repository files are modified by this feature branch.
