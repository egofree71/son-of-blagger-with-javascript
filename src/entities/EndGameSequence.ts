import { GameSessionConstants } from "../state/gameSessionConstants";

export interface EndGameSequenceResult
{
    scoreDelta: number;
    airDelta: number;
    airChanged: boolean;
    airCleared: boolean;
    messageReady: boolean;
}

type EndGameSequencePhase = "convert-air-to-score" | "show-message";

/**
 * Converts the final level's remaining air into score before the ending screen.
 *
 * The sequence emits small score and air deltas instead of mutating state
 * directly. GameScene applies those deltas so the session state and HUD remain
 * the single source of truth for score and air.
 */
export class EndGameSequence
{
    private static readonly REFERENCE_FPS = 60;
    private static readonly LOGICAL_FRAME_MS = 1000 / EndGameSequence.REFERENCE_FPS;

    private phase: EndGameSequencePhase = "convert-air-to-score";
    private frameAccumulatorMs = 0;
    private playing = false;

    /**
     * Starts the final air-to-score conversion from the beginning.
     */
    start(): void
    {
        this.phase = "convert-air-to-score";
        this.frameAccumulatorMs = 0;
        this.playing = true;
    }

    /**
     * Stops the conversion and resets its internal timer.
     */
    stop(): void
    {
        this.playing = false;
        this.frameAccumulatorMs = 0;
    }

    /**
     * Advances the sequence and reports the state deltas to apply this frame.
     */
    update(deltaMs: number, currentAirLevel: number): EndGameSequenceResult
    {
        const result = this.createResult();

        if (!this.playing) {
            return result;
        }

        this.frameAccumulatorMs += deltaMs;

        while (this.frameAccumulatorMs >= EndGameSequence.LOGICAL_FRAME_MS) {
            this.frameAccumulatorMs -= EndGameSequence.LOGICAL_FRAME_MS;
            const frameResult = this.updateOneLogicalFrame(currentAirLevel);
            result.scoreDelta += frameResult.scoreDelta;
            result.airDelta += frameResult.airDelta;
            result.airChanged = result.airChanged || frameResult.airChanged;
            result.airCleared = result.airCleared || frameResult.airCleared;
            result.messageReady = result.messageReady || frameResult.messageReady;

            if (frameResult.airChanged || frameResult.airCleared || frameResult.messageReady || !this.playing) {
                break;
            }
        }

        return result;
    }

    /**
     * Reports whether gameplay should currently be blocked by the ending flow.
     */
    isPlaying(): boolean
    {
        return this.playing;
    }

    private updateOneLogicalFrame(currentAirLevel: number): EndGameSequenceResult
    {
        if (this.phase === "show-message") {
            this.playing = false;
            return {
                ...this.createResult(),
                messageReady: true
            };
        }

        if (currentAirLevel > 0) {
            return {
                ...this.createResult(),
                scoreDelta: GameSessionConstants.END_GAME_SCORE_STEP,
                airDelta: -GameSessionConstants.END_GAME_AIR_STEP,
                airChanged: true
            };
        }

        this.phase = "show-message";
        return {
            ...this.createResult(),
            airCleared: true
        };
    }

    private createResult(): EndGameSequenceResult
    {
        return {
            scoreDelta: 0,
            airDelta: 0,
            airChanged: false,
            airCleared: false,
            messageReady: false
        };
    }
}
