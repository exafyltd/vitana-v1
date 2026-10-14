/**
 * VTID-05176 — dev-only catalogue of Vitana Native UI (plan change 31): every
 * primitive in every variant, size and state, overlays launched by buttons, all
 * toast kinds, a light/dark switch and the current direction. Every section has
 * a stable testID (simulator screenshots / Maestro later, STATUS row 8b).
 *
 * Renders only for the `development` and `test-g1` app profiles; any other
 * profile redirects to `/`. Listed in the parity ledger's `native_only`.
 * Visible text uses only the existing keys in src/ui/catalogue-keys.ts — no
 * section headings as raw text, no new i18n keys.
 */
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { Redirect } from 'expo-router';
import { ArrowLeftRight, Moon, MoreHorizontal, Sun, User } from 'lucide-react-native';
import { useI18n } from '../src/i18n/I18nProvider';
import { CATALOGUE_KEYS as K } from '../src/ui/catalogue-keys';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Avatar,
  AvatarFallback,
  BADGE_VARIANTS,
  Badge,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Dialog,
  DialogContent,
  DialogContentNoAnimation,
  DialogContentNoOverlay,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Progress,
  RadioGroup,
  RadioGroupItem,
  ResponsiveConfirmDialog,
  ResponsiveConfirmDialogAction,
  ResponsiveConfirmDialogCancel,
  ResponsiveConfirmDialogContent,
  ResponsiveConfirmDialogDescription,
  ResponsiveConfirmDialogFooter,
  ResponsiveConfirmDialogHeader,
  ResponsiveConfirmDialogTitle,
  ResponsiveConfirmDialogTrigger,
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
  ScrollArea,
  ScrollBar,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  Separator,
  SHEET_SIDES,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Skeleton,
  Slider,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  VitanaUIProvider,
  notify,
  notifyError,
  notifyInfo,
  notifySuccess,
  notifyWarning,
  toast,
  useTheme,
} from '../src/ui';
import { toast as sonnerToast } from '../src/ui/sonner';

export const CATALOGUE_PROFILES = ['development', 'test-g1'] as const;

export function catalogueAllowed(profile: unknown): boolean {
  return typeof profile === 'string' && (CATALOGUE_PROFILES as readonly string[]).includes(profile);
}

function Section({ id, children }: { id: string; children: ReactNode }) {
  return (
    <View testID={`catalogue-${id}`} style={styles.section}>
      {children}
      <Separator style={styles.sectionRule} />
    </View>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

function Catalogue({ dark, setDark }: { dark: boolean; setDark: (v: boolean) => void }) {
  const { t } = useI18n();
  const theme = useTheme();
  const [progress] = useState(40);
  const fg = theme.colors.foreground;

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.content} testID="native-ui-catalogue">
      <Section id="controls">
        <Row>
          <Sun size={18} color={fg} />
          <Switch testID="catalogue-scheme-switch" checked={dark} onCheckedChange={setDark} />
          <Moon size={18} color={fg} />
          <View testID="catalogue-direction" accessible accessibilityValue={{ text: theme.direction }} style={styles.direction}>
            <ArrowLeftRight size={18} color={fg} style={theme.direction === 'rtl' ? styles.flip : undefined} />
          </View>
        </Row>
      </Section>

      <Section id="buttons">
        {BUTTON_VARIANTS.map((variant) => (
          <Row key={variant}>
            {BUTTON_SIZES.map((size) =>
              size === 'icon' ? (
                <Button key={size} testID={`btn-${variant}-${size}`} variant={variant} size={size} accessibilityLabel={t(K.more)}>
                  <MoreHorizontal size={16} color={fg} />
                </Button>
              ) : (
                <Button key={size} testID={`btn-${variant}-${size}`} variant={variant} size={size}>
                  {t(K.save)}
                </Button>
              ),
            )}
            <Button testID={`btn-${variant}-disabled`} variant={variant} disabled>
              {t(K.cancel)}
            </Button>
          </Row>
        ))}
      </Section>

      <Section id="badges">
        <Row>
          {BADGE_VARIANTS.map((variant) => (
            <Badge key={variant} variant={variant} testID={`badge-${variant}`}>
              {t(K.yes)}
            </Badge>
          ))}
        </Row>
      </Section>

      <Section id="card">
        <Card>
          <CardHeader>
            <CardTitle>{t(K.done)}</CardTitle>
            <CardDescription>{t(K.learnMore)}</CardDescription>
          </CardHeader>
          <CardContent>
            <Text>{t(K.loading)}</Text>
          </CardContent>
          <CardFooter>
            <Button>{t(K.next)}</Button>
          </CardFooter>
        </Card>
      </Section>

      <Section id="fields">
        <Label nativeID="catalogue-search-label">{t(K.search)}</Label>
        <Input accessibilityLabelledBy="catalogue-search-label" placeholder={t(K.search)} testID="input-default" />
        <Input placeholder={t(K.search)} aria-invalid testID="input-invalid" />
        <Input placeholder={t(K.search)} disabled testID="input-disabled" />
        <Textarea placeholder={t(K.search)} testID="textarea" />
      </Section>

      <Section id="separator-skeleton">
        <Separator />
        <Row>
          <Separator orientation="vertical" style={styles.vertical} />
          <Skeleton accessibilityLabel={t(K.loading)} style={styles.skeleton} />
        </Row>
      </Section>

      <Section id="dialogs">
        <Row>
          <Dialog>
            <DialogTrigger asChild>
              <Button testID="open-dialog">{t(K.more)}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t(K.done)}</DialogTitle>
                <DialogDescription>{t(K.learnMore)}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button>{t(K.save)}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button testID="open-dialog-no-animation" variant="secondary">
                {t(K.next)}
              </Button>
            </DialogTrigger>
            <DialogContentNoAnimation testID="dialog-no-animation">
              <DialogTitle>{t(K.done)}</DialogTitle>
            </DialogContentNoAnimation>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button testID="open-dialog-no-overlay" variant="outline">
                {t(K.back)}
              </Button>
            </DialogTrigger>
            <DialogContentNoOverlay testID="dialog-no-overlay">
              <DialogTitle>{t(K.done)}</DialogTitle>
            </DialogContentNoOverlay>
          </Dialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button testID="open-alert-dialog" variant="destructive">
                {t(K.delete)}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t(K.delete)}</AlertDialogTitle>
                <AlertDialogDescription>{t(K.learnMore)}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction>{t(K.yes)}</AlertDialogAction>
                <AlertDialogCancel>{t(K.no)}</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <ResponsiveConfirmDialog>
            <ResponsiveConfirmDialogTrigger asChild>
              <Button testID="open-confirm-dialog" variant="outline">
                {t(K.delete)}
              </Button>
            </ResponsiveConfirmDialogTrigger>
            <ResponsiveConfirmDialogContent>
              <ResponsiveConfirmDialogHeader>
                <ResponsiveConfirmDialogTitle>{t(K.delete)}</ResponsiveConfirmDialogTitle>
                <ResponsiveConfirmDialogDescription>{t(K.learnMore)}</ResponsiveConfirmDialogDescription>
              </ResponsiveConfirmDialogHeader>
              <ResponsiveConfirmDialogFooter>
                <ResponsiveConfirmDialogAction>{t(K.yes)}</ResponsiveConfirmDialogAction>
                <ResponsiveConfirmDialogCancel>{t(K.no)}</ResponsiveConfirmDialogCancel>
              </ResponsiveConfirmDialogFooter>
            </ResponsiveConfirmDialogContent>
          </ResponsiveConfirmDialog>
        </Row>
      </Section>

      <Section id="sheets">
        <Row>
          {SHEET_SIDES.map((side) => (
            <Sheet key={side}>
              <SheetTrigger asChild>
                <Button testID={`open-sheet-${side}`} variant="outline" size="sm">
                  {t(K.more)}
                </Button>
              </SheetTrigger>
              <SheetContent side={side} testID={`sheet-${side}`}>
                <SheetHeader>
                  <SheetTitle>{t(K.done)}</SheetTitle>
                  <SheetDescription>{t(K.learnMore)}</SheetDescription>
                </SheetHeader>
              </SheetContent>
            </Sheet>
          ))}
          <Drawer>
            <DrawerTrigger asChild>
              <Button testID="open-drawer" variant="soft">
                {t(K.more)}
              </Button>
            </DrawerTrigger>
            <DrawerContent showCloseButton>
              <DrawerHeader>
                <DrawerTitle>{t(K.done)}</DrawerTitle>
                <DrawerDescription>{t(K.learnMore)}</DrawerDescription>
              </DrawerHeader>
              <DrawerFooter>
                <Button>{t(K.save)}</Button>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
          {[false, true].map((fullscreen) => (
            <ResponsiveDialog key={String(fullscreen)}>
              <ResponsiveDialogTrigger asChild>
                <Button testID={fullscreen ? 'open-responsive-dialog-fullscreen' : 'open-responsive-dialog'} variant="pill">
                  {t(K.next)}
                </Button>
              </ResponsiveDialogTrigger>
              <ResponsiveDialogContent fullscreenOnMobile={fullscreen} testID={fullscreen ? 'responsive-dialog-fullscreen' : 'responsive-dialog'}>
                <ResponsiveDialogHeader>
                  <ResponsiveDialogTitle>{t(K.done)}</ResponsiveDialogTitle>
                  <ResponsiveDialogDescription>{t(K.learnMore)}</ResponsiveDialogDescription>
                </ResponsiveDialogHeader>
                <ResponsiveDialogBody>
                  <Text>{t(K.loading)}</Text>
                </ResponsiveDialogBody>
                <ResponsiveDialogFooter>
                  <Button>{t(K.save)}</Button>
                </ResponsiveDialogFooter>
              </ResponsiveDialogContent>
            </ResponsiveDialog>
          ))}
          <ResponsivePopover>
            <ResponsivePopoverTrigger asChild>
              <Button testID="open-responsive-popover" variant="solid">
                {t(K.more)}
              </Button>
            </ResponsivePopoverTrigger>
            <ResponsivePopoverContent title={t(K.done)}>
              <Text>{t(K.learnMore)}</Text>
            </ResponsivePopoverContent>
          </ResponsivePopover>
        </Row>
      </Section>

      <Section id="popover-tooltip">
        <Row>
          <Popover>
            <PopoverTrigger asChild>
              <Button testID="open-popover" variant="outline">
                {t(K.more)}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start">
              <Text>{t(K.learnMore)}</Text>
            </PopoverContent>
          </Popover>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button testID="open-tooltip" variant="ghost">
                  {t(K.more)}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t(K.learnMore)}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Row>
      </Section>

      <Section id="tabs">
        <Tabs defaultValue="next">
          <TabsList>
            <TabsTrigger value="next">{t(K.next)}</TabsTrigger>
            <TabsTrigger value="back">{t(K.back)}</TabsTrigger>
            <TabsTrigger value="more" disabled>
              {t(K.more)}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="next">
            <Text>{t(K.done)}</Text>
          </TabsContent>
          <TabsContent value="back">
            <Text>{t(K.learnMore)}</Text>
          </TabsContent>
        </Tabs>
      </Section>

      <Section id="select">
        <Select>
          <SelectTrigger testID="select-trigger">
            <SelectValue placeholder={t(K.select)} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>{t(K.select)}</SelectLabel>
              <SelectItem value="yes">{t(K.yes)}</SelectItem>
              <SelectItem value="no">{t(K.no)}</SelectItem>
              <SelectSeparator />
              <SelectItem value="retry" disabled>
                {t(K.retry)}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Section>

      <Section id="toggles">
        <Row>
          <Switch defaultChecked={false} />
          <Switch defaultChecked />
          <Switch disabled />
          <Checkbox />
          <Checkbox defaultChecked />
          <Checkbox defaultChecked="indeterminate" />
          <Checkbox disabled />
        </Row>
        <RadioGroup defaultValue="yes" orientation="horizontal">
          <RadioGroupItem value="yes" accessibilityLabel={t(K.yes)} />
          <RadioGroupItem value="no" accessibilityLabel={t(K.no)} />
          <RadioGroupItem value="retry" accessibilityLabel={t(K.retry)} disabled />
        </RadioGroup>
      </Section>

      <Section id="slider">
        <Slider defaultValue={[40]} accessibilityLabel={t(K.select)} testID="slider-single" />
        <Slider defaultValue={[25, 75]} min={18} max={99} accessibilityLabel={t(K.select)} testID="slider-range" />
        <Slider defaultValue={[60]} disabled accessibilityLabel={t(K.select)} testID="slider-disabled" />
      </Section>

      <Section id="accordion">
        <Accordion type="single" collapsible defaultValue="a">
          <AccordionItem value="a">
            <AccordionTrigger>{t(K.more)}</AccordionTrigger>
            <AccordionContent>{t(K.learnMore)}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="b">
            <AccordionTrigger>{t(K.next)}</AccordionTrigger>
            <AccordionContent>{t(K.done)}</AccordionContent>
          </AccordionItem>
        </Accordion>
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="link">{t(K.more)}</Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Text>{t(K.learnMore)}</Text>
          </CollapsibleContent>
        </Collapsible>
      </Section>

      <Section id="avatar-progress">
        <Row>
          {/* No image URL: the catalogue makes no network request; the fallback shows. */}
          <Avatar>
            <AvatarFallback>
              <User size={18} color={fg} />
            </AvatarFallback>
          </Avatar>
        </Row>
        {[0, progress, 100].map((value) => (
          <Progress key={value} value={value} accessibilityLabel={t(K.loading)} testID={`progress-${value}`} />
        ))}
      </Section>

      <Section id="scroll-area">
        <ScrollArea>
          <Row>
            {BADGE_VARIANTS.map((variant) => (
              <Badge key={variant} variant={variant}>
                {t(K.no)}
              </Badge>
            ))}
          </Row>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </Section>

      <Section id="toasts">
        <Row>
          <Button testID="toast-notify" variant="outline" size="sm" onPress={() => notify(K.updating)}>
            {t(K.next)}
          </Button>
          <Button testID="toast-success" variant="outline" size="sm" onPress={() => notifySuccess(K.done)}>
            {t(K.done)}
          </Button>
          <Button testID="toast-error" variant="outline" size="sm" onPress={() => notifyError(K.failedLoadData)}>
            {t(K.retry)}
          </Button>
          <Button testID="toast-warning" variant="outline" size="sm" onPress={() => notifyWarning(K.offline)}>
            {t(K.back)}
          </Button>
          <Button testID="toast-info" variant="outline" size="sm" onPress={() => notifyInfo(K.reconnecting)}>
            {t(K.more)}
          </Button>
          <Button testID="toast-shadcn" variant="outline" size="sm" onPress={() => toast({ title: t(K.done) })}>
            {t(K.yes)}
          </Button>
          <Button testID="toast-sonner" variant="outline" size="sm" onPress={() => sonnerToast.success(t(K.done))}>
            {t(K.no)}
          </Button>
        </Row>
      </Section>
    </ScrollView>
  );
}

export default function NativeUiCatalogue() {
  const [dark, setDark] = useState(false);
  if (!catalogueAllowed(Constants.expoConfig?.extra?.profile)) return <Redirect href="/" />;
  return (
    <VitanaUIProvider colorScheme={dark ? 'dark' : 'light'}>
      <Catalogue dark={dark} setDark={setDark} />
    </VitanaUIProvider>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  section: { gap: 12 },
  sectionRule: { marginTop: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  direction: { padding: 4 },
  flip: { transform: [{ scaleX: -1 }] },
  vertical: { height: 24 },
  skeleton: { height: 24, width: 120 },
});
