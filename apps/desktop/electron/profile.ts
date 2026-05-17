import { promises as fs } from "node:fs";
import path from "node:path";
import { newId, type Profile, type ProfileId } from "@aether/shared";

interface ProfilePersist {
  profiles: Profile[];
  defaultProfileId: ProfileId;
}

/**
 * Isolated browser profiles. Each profile maps to a unique Electron
 * `session.partition` (`persist:prf_xxx`) so cookies, cache, service workers
 * and `localStorage` are completely segregated between profiles.
 *
 * Profiles power the Workspace concept — switching workspace switches profile.
 */
export class ProfileManager {
  private readonly file: string;
  private state: ProfilePersist = { profiles: [], defaultProfileId: "" as ProfileId };

  constructor(userDataDir: string) {
    this.file = path.join(userDataDir, "aether-profiles.json");
  }

  async hydrate(): Promise<void> {
    try {
      const raw = await fs.readFile(this.file, "utf-8");
      this.state = JSON.parse(raw) as ProfilePersist;
    } catch {
      const defaultProfile: Profile = {
        id: newId("profile"),
        name: "Personal",
        partition: `persist:${newId("profile")}`,
        createdAt: Date.now(),
      };
      this.state = { profiles: [defaultProfile], defaultProfileId: defaultProfile.id };
      await this.flush();
    }
  }

  getDefault(): Profile {
    const p = this.state.profiles.find((x) => x.id === this.state.defaultProfileId);
    if (!p) throw new Error("Default profile is missing");
    return p;
  }

  list(): Profile[] {
    return [...this.state.profiles];
  }

  async create(name: string): Promise<Profile> {
    const profile: Profile = {
      id: newId("profile"),
      name,
      partition: `persist:${newId("profile")}`,
      createdAt: Date.now(),
    };
    this.state.profiles.push(profile);
    await this.flush();
    return profile;
  }

  async setDefault(profileId: ProfileId): Promise<void> {
    if (!this.state.profiles.some((p) => p.id === profileId)) {
      throw new Error(`Profile ${profileId} not found`);
    }
    this.state.defaultProfileId = profileId;
    await this.flush();
  }

  private async flush(): Promise<void> {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(this.state, null, 2), "utf-8");
  }
}
