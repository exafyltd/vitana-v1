/**
 * VTID-05456 (native-wave2-health-biology-r3/health-plans-services) —
 * /health/education (HEALTH.EDUCATION + ?tab=videos / ?tab=podcasts) and
 * /health/services-hub (HEALTH.SERVICES_HUB + ?tab=medicalServices /
 * wellnessPrograms / insuranceSupport / myServices): tab switch, `?tab=`
 * deep links, the action popups' destinations, the service detail sheet and
 * its disabled Book Now (the web's Stripe booking flow is not ported) — no
 * network, no health-data read, no write.
 */
import '../../helpers/no-network';
import { router, searchParams } from './helpers';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../../src/auth/client';
import { __setGatewayForTests } from '../../../src/auth/gateway';
import { EducationResourcesScreen } from '../../../src/screens/health/EducationResourcesScreen';
import { WellnessServicesScreen } from '../../../src/screens/health/WellnessServicesScreen';
import { healthWrapper } from './helpers';

afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});
beforeEach(() => {
  searchParams.current = {};
  router.navigate.mockClear();
});

describe('EducationResourcesScreen', () => {
  it('opens on the articles tab with the six article cards', () => {
    const { wrapper } = healthWrapper();
    render(<EducationResourcesScreen />, { wrapper });
    expect(within(screen.getByTestId('health-header')).getByText('Education & Science')).toBeTruthy();
    expect(screen.getByTestId('health-education-articles')).toBeTruthy();
    expect(screen.getByText('Understanding Your Vitana Index')).toBeTruthy();
    expect(screen.getByText('5 min read')).toBeTruthy();
    expect(screen.getByTestId('health-education-tab-articles').props.accessibilityState).toEqual({ selected: true });
  });

  it('switches to videos and podcasts', () => {
    const { wrapper } = healthWrapper();
    render(<EducationResourcesScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('health-education-tab-videos'));
    expect(screen.getByTestId('health-education-videos')).toBeTruthy();
    expect(screen.getByText('Vitana Index Deep Dive')).toBeTruthy();
    expect(screen.getByText('2.1K views')).toBeTruthy();
    fireEvent.press(screen.getByTestId('health-education-tab-podcasts'));
    expect(screen.getByTestId('health-education-podcasts')).toBeTruthy();
    expect(screen.getByText('The Science of Longevity')).toBeTruthy();
    expect(screen.getByText('Ep. 12')).toBeTruthy();
    expect(screen.queryByTestId('health-education-articles')).toBeNull();
  });

  it.each([
    ['videos', 'health-education-videos'],
    ['podcasts', 'health-education-podcasts'],
    ['bogus', 'health-education-articles'],
  ])('?tab=%s opens %s', (tab, testID) => {
    searchParams.current = { tab };
    const { wrapper } = healthWrapper();
    render(<EducationResourcesScreen />, { wrapper });
    expect(screen.getByTestId(testID)).toBeTruthy();
  });

  it('Education Actions lists the seven actions; each opens /health/education', () => {
    const { wrapper, nonReads } = healthWrapper();
    render(<EducationResourcesScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('health-education-actions-open'));
    const dialog = screen.getByTestId('health-education-actions-content');
    expect(within(dialog).getByText('Education Actions')).toBeTruthy();
    for (const id of ['browseArticles', 'watchVideos', 'listenPodcasts', 'searchContent', 'myBookmarks', 'downloadOffline', 'healthCourses']) {
      expect(screen.getByTestId(`health-education-actions-${id}`)).toBeTruthy();
    }
    fireEvent.press(screen.getByTestId('health-education-actions-myBookmarks'));
    expect(router.navigate).toHaveBeenCalledWith('/health/education');
    expect(nonReads()).toEqual([]);
  });
});

describe('WellnessServicesScreen', () => {
  it('opens on preventive care with its intro and four service cards', () => {
    const { wrapper } = healthWrapper();
    render(<WellnessServicesScreen />, { wrapper });
    expect(within(screen.getByTestId('health-header')).getByText('Services HUB')).toBeTruthy();
    expect(screen.getByTestId('health-services-preventiveCare')).toBeTruthy();
    for (const id of ['CT-301', 'CT-302', 'CT-303', 'CT-304']) expect(screen.getByTestId(`health-service-${id}`)).toBeTruthy();
    expect(screen.getByText('Annual Physical Exam')).toBeTruthy();
    expect(screen.getByText('+25 points')).toBeTruthy();
  });

  it.each([
    ['medicalServices', ['CT-305', 'CT-306', 'CT-307', 'CT-308']],
    ['wellnessPrograms', ['CT-309', 'CT-310', 'CT-311', 'CT-312']],
    ['insuranceSupport', ['CT-313', 'CT-314', 'CT-315', 'CT-316']],
    ['myServices', ['CT-317', 'CT-318', 'CT-319', 'CT-320']],
  ])('?tab=%s deep-links to its section', (tab, ids) => {
    searchParams.current = { tab };
    const { wrapper } = healthWrapper();
    render(<WellnessServicesScreen />, { wrapper });
    expect(screen.getByTestId(`health-services-${tab}`)).toBeTruthy();
    for (const id of ids) expect(screen.getByTestId(`health-service-${id}`)).toBeTruthy();
  });

  it('switches sections; My Services shows the count badges, no impact points', () => {
    const { wrapper } = healthWrapper();
    render(<WellnessServicesScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('health-services-tab-myServices'));
    expect(screen.getByTestId('health-services-myServices')).toBeTruthy();
    expect(screen.getByText('My Appointments')).toBeTruthy();
    expect(screen.getByText('3 upcoming')).toBeTruthy();
    expect(screen.queryByText(/points$/)).toBeNull();
  });

  it('a card opens the service detail sheet; Book Now is disabled (no booking / payment flow)', () => {
    const { wrapper, nonReads } = healthWrapper();
    render(<WellnessServicesScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('health-service-CT-301'));
    expect(screen.getByTestId('health-service-detail')).toBeTruthy();
    expect(screen.getByText('Comprehensive Lab Test')).toBeTruthy();
    expect(screen.getByText('$299')).toBeTruthy();
    expect(screen.getByText('80+ biomarkers tested')).toBeTruthy();
    expect(screen.getByTestId('health-service-provider-p1')).toBeTruthy();
    const book = screen.getByTestId('health-service-book-now');
    expect(book.props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(book);
    expect(router.navigate).not.toHaveBeenCalled();
    expect(nonReads()).toEqual([]);
  });

  it('a card without a detail record does not open a sheet (the web drawer throws there)', () => {
    const { wrapper } = healthWrapper();
    render(<WellnessServicesScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('health-service-CT-302'));
    expect(screen.queryByTestId('health-service-detail')).toBeNull();
  });

  it('Service Actions navigate to the web destinations', () => {
    const { wrapper } = healthWrapper();
    render(<WellnessServicesScreen />, { wrapper });
    const go = (id: string) => {
      fireEvent.press(screen.getByTestId('health-services-actions-open'));
      fireEvent.press(screen.getByTestId(`health-services-actions-${id}`));
      return router.navigate.mock.calls[router.navigate.mock.calls.length - 1][0];
    };
    expect(go('orderLabTests')).toBe('/discover');
    expect(go('myAppointments')).toBe('/calendar/appointments');
    expect(go('findSpecialists')).toBe('/discover/doctors-coaches');
    expect(go('telemedicine')).toBe('/health/services-hub');
  });
});
