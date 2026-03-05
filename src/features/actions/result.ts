export type ActionResult = {
  handled: boolean;
  succeeded: boolean;
  reason?: string;
};

export const actionSucceeded = (reason?: string): ActionResult => ({
  handled: true,
  succeeded: true,
  reason,
});

export const actionFailed = (reason?: string): ActionResult => ({
  handled: true,
  succeeded: false,
  reason,
});

export const actionUnhandled = (reason?: string): ActionResult => ({
  handled: false,
  succeeded: false,
  reason,
});
