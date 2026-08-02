/** What the endpoint is asked to charge. */
export interface ChargeInput {
  customerId: string;
  amountCents: number;
  currency: string;
}

/** What the gateway answers with once the money has moved. */
export interface Charge extends ChargeInput {
  id: string;
  status: 'succeeded';
}

/**
 * The card gateway, standing in for the one thing here that is not your
 * database: a call over the network that moves real money and cannot be
 * rolled back by a transaction of yours.
 *
 * It keeps every charge it has been asked to make, which is how a checkpoint
 * tells one charge from two.
 */
export class FakeGateway {
  readonly charges: Charge[] = [];
  private nextId = 1;
  private open = true;
  private held: (() => void)[] = [];
  private watchers: (() => void)[] = [];

  async charge(input: ChargeInput): Promise<Charge> {
    const charge: Charge = {
      id: `ch_${this.nextId}`,
      customerId: input.customerId,
      amountCents: input.amountCents,
      currency: input.currency,
      status: 'succeeded',
    };
    this.nextId += 1;
    this.charges.push(charge);
    for (const watcher of this.watchers.splice(0)) watcher();

    if (this.open) {
      // A call over the network never comes back in the same tick.
      await new Promise((resolve) => setTimeout(resolve, 0));
    } else {
      await new Promise<void>((resolve) => this.held.push(resolve));
    }

    return charge;
  }

  /**
   * Test-only. Real gateways have none of these: they are how a checkpoint
   * holds one charge open long enough for a second request to arrive during it.
   */
  hold(): void {
    this.open = false;
  }

  release(): void {
    this.open = true;
    for (const resolve of this.held.splice(0)) resolve();
  }

  /** Resolves the next time a charge reaches the gateway. */
  nextCharge(): Promise<void> {
    return new Promise((resolve) => this.watchers.push(resolve));
  }
}
