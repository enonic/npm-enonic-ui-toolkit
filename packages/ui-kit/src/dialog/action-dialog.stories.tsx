import { Button, Input } from '@enonic/ui';
import type { Meta, StoryObj } from '@storybook/preact-vite';
import { type ReactElement, useState } from 'react';

import { ActionDialog } from './action-dialog';
import { DeleteConfirm } from './delete-confirm';
import type { DeleteTarget } from './delete-expectation';
import { DialogPreset } from './dialog-preset';
import { useCloseGuard } from './use-close-guard';

const meta: Meta = {
  title: 'UiKit/ActionDialog',
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

const USERS: DeleteTarget[] = [
  { key: 'user:system:ada', name: 'ada', label: 'Ada Lovelace (ada)' },
  { key: 'user:system:grace', name: 'grace', label: 'Grace Hopper (grace)' },
  { key: 'user:system:linus', name: 'linus', label: 'Linus Torvalds (linus)' },
];

function Opener({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: (open: boolean, setOpen: (next: boolean) => void) => ReactElement;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col items-center gap-y-3 p-4">
      <div className="text-subtle max-w-120 text-sm">{description}</div>
      <Button variant="solid" label={label} onClick={() => setOpen(true)} />
      {children(open, setOpen)}
    </div>
  );
}

//
// * Presets
//

export const PlainQuestion: Story = {
  name: 'Presets / Confirm',
  render: () => (
    <Opener
      label="Publish"
      description="DialogPreset.Confirm, the plain question: a title, the question, and two answers of equal weight. Confirm and Cancel both close; Escape and the mask are Cancel."
    >
      {(open, setOpen) => (
        <DialogPreset.Confirm
          open={open}
          onOpenChange={setOpen}
          title="Publish 3 items?"
          question="They go live as soon as the publish completes."
          confirmLabel="Publish"
          onConfirm={() => setOpen(false)}
        />
      )}
    </Opener>
  ),
};

export const DeleteOne: Story = {
  name: 'Presets / Delete One',
  render: () => (
    <Opener
      label="Delete user"
      description="DeleteConfirm with one target: the gate asks for its name. The field has the focus as the dialog opens; a match locks the field, enables the red button and moves the focus onto it, so Enter deletes. A wrong entry is reported half a second after it stops changing."
    >
      {(open, setOpen) => (
        <ActionDialog.Root open={open} onOpenChange={setOpen}>
          <ActionDialog.Portal>
            <ActionDialog.Overlay />
            <DeleteConfirm
              title="Delete user"
              question={
                <>
                  Delete <strong>Ada Lovelace</strong>? Her memberships go with her.
                </>
              }
              targets={USERS.slice(0, 1)}
              onConfirm={() => setOpen(false)}
            />
          </ActionDialog.Portal>
        </ActionDialog.Root>
      )}
    </Opener>
  ),
};

export const DeleteMany: Story = {
  name: 'Presets / Delete Many',
  render: () => (
    <Opener
      label="Delete 3 users"
      description="DeleteConfirm with several targets: the gate asks for their count rather than three names, and the field takes a numeric keyboard on a phone. The targets are listed under the question."
    >
      {(open, setOpen) => (
        <ActionDialog.Root open={open} onOpenChange={setOpen}>
          <ActionDialog.Portal>
            <ActionDialog.Overlay />
            <DeleteConfirm
              title="Delete users"
              question="Delete these 3 users? Their memberships go with them."
              targets={USERS}
              onConfirm={() => setOpen(false)}
            />
          </ActionDialog.Portal>
        </ActionDialog.Root>
      )}
    </Opener>
  ),
};

export const DeleteWithoutGate: Story = {
  name: 'Presets / Delete Without Gate',
  render: () => (
    <Opener
      label="Remove binding"
      description="DeleteConfirm with expected={null}: no gate, the red button is enabled from the start, and the view is the plain question with a destructive answer."
    >
      {(open, setOpen) => (
        <ActionDialog.Root open={open} onOpenChange={setOpen}>
          <ActionDialog.Portal>
            <ActionDialog.Overlay />
            <DeleteConfirm
              title="Remove binding"
              question="Remove the application from this ID provider? Its configuration is kept."
              targets={[]}
              expected={null}
              confirmLabel="Remove"
              size="default"
              onConfirm={() => setOpen(false)}
            />
          </ActionDialog.Portal>
        </ActionDialog.Root>
      )}
    </Opener>
  ),
};

//
// * Composed
//

export const DeleteAfterList: Story = {
  name: 'Composed / Delete After List',
  render: () => {
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<'list' | 'confirm'>('list');
    const close = (): void => {
      setOpen(false);
      setView('list');
    };

    return (
      <div className="flex flex-col items-center gap-y-3 p-4">
        <div className="text-subtle max-w-120 text-sm">
          Two views under one Root, as Content Studio deletes: the list first, the gate after it.
          Cancel in the gate goes back to the list; Escape closes.
        </div>
        <Button variant="solid" label="Delete selection" onClick={() => setOpen(true)} />

        <ActionDialog.Root open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
          <ActionDialog.Portal>
            <ActionDialog.Overlay />
            {view === 'list' && (
              <ActionDialog.Content size="medium" data-component="DeleteList">
                <ActionDialog.DefaultHeader title="Delete 3 users" withClose />
                <ActionDialog.Body>
                  <ul className="flex flex-col gap-2.5">
                    {USERS.map(({ key, label }) => (
                      <li key={key}>{label}</li>
                    ))}
                  </ul>
                </ActionDialog.Body>
                <ActionDialog.Footer
                  intent="danger"
                  confirmLabel="Delete"
                  cancelVariant="outline"
                  closeOnConfirm={false}
                  onConfirm={() => setView('confirm')}
                  onCancel={close}
                />
              </ActionDialog.Content>
            )}
            {view === 'confirm' && (
              <DeleteConfirm
                title="Delete 3 users"
                question="Type the number to confirm."
                targets={USERS}
                closeOnCancel={false}
                onCancel={() => setView('list')}
                onConfirm={close}
              />
            )}
          </ActionDialog.Portal>
        </ActionDialog.Root>
      </div>
    );
  },
};

export const FormWithFooterConfirmation: Story = {
  name: 'Composed / Form With Footer Confirmation',
  render: () => {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('Ada Lovelace');
    const [saved, setSaved] = useState('Ada Lovelace');
    const guard = useCloseGuard({ dirty: name !== saved, open, onOpenChange: setOpen });

    return (
      <div className="flex flex-col items-center gap-y-3 p-4">
        <div className="text-subtle max-w-120 text-sm">
          Edit the name, then close by the mask, the X, Escape or Cancel: the question takes the
          footer, the form stays in sight but inert, Escape keeps editing, and the focus comes back
          where it left.
        </div>
        <Button variant="solid" label="Edit profile" onClick={() => setOpen(true)} />

        <ActionDialog.Root open={open} onOpenChange={guard.onOpenChange}>
          <ActionDialog.Portal>
            <ActionDialog.Overlay />
            <ActionDialog.Content size="medium">
              <ActionDialog.DefaultHeader
                title="Edit profile"
                description="Changes are kept until you save"
                withClose
              />
              <ActionDialog.Body>
                <Input
                  label="Name"
                  value={name}
                  onChange={(event) => setName(event.currentTarget.value)}
                />
              </ActionDialog.Body>
              <ActionDialog.Footer
                confirmLabel="Save"
                closeOnCancel={false}
                closeOnConfirm={false}
                onCancel={guard.requestClose}
                onConfirm={() => {
                  setSaved(name);
                  setOpen(false);
                }}
                question={
                  guard.asking
                    ? {
                        text: 'Discard unsaved changes?',
                        intent: 'danger',
                        confirmLabel: 'Discard',
                        onKeep: guard.keep,
                        onConfirm: () => {
                          setName(saved);
                          guard.discard();
                        },
                      }
                    : undefined
                }
              />
            </ActionDialog.Content>
          </ActionDialog.Portal>
        </ActionDialog.Root>
      </div>
    );
  },
};

export const WizardWithCloseGuard: Story = {
  name: 'Composed / Wizard With Close Guard',
  render: () => {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState('name');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const guard = useCloseGuard({
      dirty: name !== '' || email !== '',
      open,
      onOpenChange: setOpen,
    });
    const reset = (): void => {
      setStep('name');
      setName('');
      setEmail('');
    };

    return (
      <div className="flex flex-col items-center gap-y-3 p-4">
        <div className="text-subtle max-w-120 text-sm">
          A two-step wizard: its step controls are the footer's children. Fill a field, go to the
          next step, then close by the mask or the X — the question takes the controls' place and
          Keep editing returns to the step as it was.
        </div>
        <Button variant="solid" label="New user" onClick={() => setOpen(true)} />

        <ActionDialog.Root
          open={open}
          onOpenChange={guard.onOpenChange}
          step={step}
          onStepChange={setStep}
        >
          <ActionDialog.Portal>
            <ActionDialog.Overlay />
            <ActionDialog.Content size="medium">
              <ActionDialog.StepHeader
                step="name"
                title="New user"
                helper="Step 1 of 2"
                withClose
              />
              <ActionDialog.StepHeader
                step="email"
                title="New user"
                helper="Step 2 of 2"
                withClose
              />
              <ActionDialog.Body>
                <ActionDialog.StepContent step="name">
                  <Input
                    label="Name"
                    value={name}
                    onChange={(event) => setName(event.currentTarget.value)}
                  />
                </ActionDialog.StepContent>
                <ActionDialog.StepContent step="email">
                  <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.currentTarget.value)}
                  />
                </ActionDialog.StepContent>
              </ActionDialog.Body>
              <ActionDialog.Footer
                question={
                  guard.asking
                    ? {
                        text: 'Discard the new user?',
                        intent: 'danger',
                        confirmLabel: 'Discard',
                        onKeep: guard.keep,
                        onConfirm: () => {
                          reset();
                          guard.discard();
                        },
                      }
                    : undefined
                }
              >
                <ActionDialog.StepIndicator
                  previousLabel="Back"
                  nextLabel="Next"
                  lastStepLabel="Create"
                  dots
                  onLastStep={() => {
                    reset();
                    setOpen(false);
                  }}
                />
              </ActionDialog.Footer>
            </ActionDialog.Content>
          </ActionDialog.Portal>
        </ActionDialog.Root>
      </div>
    );
  },
};

export const TwoActions: Story = {
  name: 'Composed / Two Actions',
  render: () => (
    <Opener
      label="Edit article"
      description="A footer with more than one outcome: ActionDialog.Action beside the built-in Save. Both are enabled by the content the way Confirm is, so a gate or a validation would disable them together."
    >
      {(open, setOpen) => (
        <ActionDialog.Root open={open} onOpenChange={setOpen}>
          <ActionDialog.Portal>
            <ActionDialog.Overlay />
            <ActionDialog.Content size="medium">
              <ActionDialog.DefaultHeader title="Edit article" withClose />
              <ActionDialog.Body>
                <Input label="Title" defaultValue="On dialogs" />
              </ActionDialog.Body>
              <ActionDialog.Footer confirmLabel="Save" onConfirm={() => setOpen(false)}>
                <ActionDialog.Action
                  variant="outline"
                  label="Save and publish"
                  closeOnClick={false}
                  onClick={() => setOpen(false)}
                />
              </ActionDialog.Footer>
            </ActionDialog.Content>
          </ActionDialog.Portal>
        </ActionDialog.Root>
      )}
    </Opener>
  ),
};

export const FormWithError: Story = {
  name: 'Composed / Footer Error',
  render: () => (
    <Opener
      label="Save settings"
      description="The footer error: why the dialog is still open after a confirm that did not close it — a rejected save. The text sits beside the buttons with role=alert, and closeOnConfirm is off so the caller decides when to close."
    >
      {(open, setOpen) => (
        <ActionDialog.Root open={open} onOpenChange={setOpen}>
          <ActionDialog.Portal>
            <ActionDialog.Overlay />
            <ActionDialog.Content size="medium">
              <ActionDialog.DefaultHeader title="Settings" withClose />
              <ActionDialog.Body>
                <Input label="Display name" defaultValue="Ada" />
              </ActionDialog.Body>
              <ActionDialog.Footer
                confirmLabel="Save"
                error="The name is already taken"
                closeOnConfirm={false}
                onConfirm={() => {}}
              />
            </ActionDialog.Content>
          </ActionDialog.Portal>
        </ActionDialog.Root>
      )}
    </Opener>
  ),
};
