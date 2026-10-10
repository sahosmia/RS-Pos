import HeadingSmall from '@/components/heading-small';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/hooks/use-translation';
import AppLayout from '@/layouts/app-layout';
import { pageContainer } from '@/lib/page-container';
import { CHANGE_LOG, IMPACT_MAP as EN_IMPACT, GUIDE_TOPICS as EN_TOPICS, TROUBLESHOOTING as EN_TROUBLE, type GuideLink } from '@/lib/system-guide';
import { CHANGE_LOG_BN, GROUPS_BN, IMPACT_BN, TOPICS_BN, TROUBLESHOOTING_BN, UI_BN } from '@/lib/system-guide.bn';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'System Guide', href: '/system-guide' }];

const card = 'bg-card rounded-xl p-4 shadow-[var(--brand-card-shadow-elevated)] sm:p-5';

const TROUBLE_KEY = 'troubleshooting';
const IMPACT_KEY = 'impact';
const CHANGES_KEY = 'changes';

function LinkChips({ links }: { links: GuideLink[] }) {
    return (
        <div className="flex flex-wrap gap-2">
            {links.map((link) => (
                <Link
                    key={link.href + link.label}
                    href={link.href}
                    className="border-brand-card-border hover:bg-accent rounded-full border px-3 py-1 text-xs font-medium"
                >
                    {link.label} →
                </Link>
            ))}
        </div>
    );
}

function initialKey(): string {
    if (typeof window === 'undefined') return EN_TOPICS[0].key;
    return window.location.hash.replace('#', '') || EN_TOPICS[0].key;
}

const UI_EN = {
    title: 'System Guide',
    description:
        'How every module works, what each action changes, and where to look when something does not look right. Search for a word, an error message or a page name.',
    searchPlaceholder: 'Search the guide — e.g. serial, EMI, import, cancel, warranty…',
    quickHelp: 'Quick help',
    stuck: 'If I am stuck',
    impact: 'What one action changes',
    changes: 'Change log',
    stuckIntro: 'Find the message or symptom, see why it happens, and jump to the exact page or the logic.',
    why: 'Why: ',
    fix: 'What to do: ',
    readLogic: 'Read the logic',
    nothing: 'Nothing matches your search.',
    related: 'Common problems with this',
    impactIntro:
        'When one action happens, these places change together in a single all-or-nothing step — so if a number moved, find the action here.',
    changesIntro: 'Added here only after a change is fully confirmed.',
};

export default function SystemGuideIndex() {
    const { locale } = useTranslation();
    const isBn = locale === 'bn';
    const ui = isBn ? UI_BN : UI_EN;
    const [active, setActive] = useState(initialKey);

    const TOPICS = useMemo(
        () =>
            EN_TOPICS.map((topic) => {
                const bn = isBn ? TOPICS_BN[topic.key] : undefined;
                if (!bn) return topic;
                return {
                    ...topic,
                    group: GROUPS_BN[topic.group] ?? topic.group,
                    label: bn.label,
                    summary: bn.summary,
                    sections: topic.sections.map((section, i) => bn.sections[i] ?? section),
                };
            }),
        [isBn],
    );
    const TROUBLE = useMemo(
        () => EN_TROUBLE.map((entry, i) => (isBn && TROUBLESHOOTING_BN[i] ? { ...entry, ...TROUBLESHOOTING_BN[i] } : entry)),
        [isBn],
    );
    const IMPACT = useMemo(() => EN_IMPACT.map((row, i) => (isBn && IMPACT_BN[i] ? IMPACT_BN[i] : row)), [isBn]);
    const LOG = useMemo(() => CHANGE_LOG.map((entry, i) => (isBn && CHANGE_LOG_BN[i] ? { ...entry, note: CHANGE_LOG_BN[i] } : entry)), [isBn]);
    const [query, setQuery] = useState('');

    useEffect(() => {
        window.history.replaceState({}, '', `${window.location.pathname}#${active}`);
        window.scrollTo({ top: 0 });
    }, [active]);

    const needle = query.trim().toLowerCase();

    const matchingTopics = useMemo(() => {
        if (!needle) return TOPICS;
        return TOPICS.filter((topic) =>
            [topic.label, topic.summary, ...topic.sections.flatMap((section) => [section.title, ...section.points])]
                .join(' ')
                .toLowerCase()
                .includes(needle),
        );
    }, [needle, TOPICS]);

    const matchingTrouble = useMemo(() => {
        if (!needle) return TROUBLE;
        return TROUBLE.filter((entry) => [entry.problem, entry.why, entry.fix].join(' ').toLowerCase().includes(needle));
    }, [needle, TROUBLE]);

    const groups = useMemo(() => {
        const map = new Map<string, typeof TOPICS>();
        matchingTopics.forEach((topic) => map.set(topic.group, [...(map.get(topic.group) ?? []), topic]));
        return [...map.entries()];
    }, [matchingTopics]);

    const topic = TOPICS.find((item) => item.key === active);
    const relatedTrouble = topic ? TROUBLE.filter((entry) => entry.topic === topic.key) : [];

    const navButton = (key: string, label: string, count?: number) => (
        <button
            key={key}
            type="button"
            onClick={() => setActive(key)}
            className={cn(
                'flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-sm',
                active === key
                    ? 'bg-brand-primary/10 text-brand-primary-text font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
        >
            <span className="truncate">{label}</span>
            {count !== undefined && <span className="text-xs tabular-nums">{count}</span>}
        </button>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={ui.title} />

            <div className={cn(pageContainer.wide, 'mx-auto w-full max-w-7xl')}>
                <HeadingSmall title={ui.title} description={ui.description} />

                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={ui.searchPlaceholder} className="max-w-xl" />

                <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
                    <nav className="space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto">
                        {groups.map(([group, topics]) => (
                            <div key={group} className="space-y-0.5">
                                <p className="text-muted-foreground px-3 pb-1 text-xs font-semibold tracking-wide uppercase">{group}</p>
                                {topics.map((item) => navButton(item.key, item.label))}
                            </div>
                        ))}
                        <div className="space-y-0.5">
                            <p className="text-muted-foreground px-3 pb-1 text-xs font-semibold tracking-wide uppercase">{ui.quickHelp}</p>
                            {navButton(TROUBLE_KEY, ui.stuck, matchingTrouble.length)}
                            {navButton(IMPACT_KEY, ui.impact)}
                            {navButton(CHANGES_KEY, ui.changes)}
                        </div>
                    </nav>

                    <div className="min-w-0 space-y-4">
                        {topic && (
                            <>
                                <div>
                                    <h2 className="text-lg font-semibold">{topic.label}</h2>
                                    <p className="text-muted-foreground text-sm">{topic.summary}</p>
                                </div>
                                {topic.links && <LinkChips links={topic.links} />}
                                {topic.sections.map((section) => (
                                    <section key={section.title} className={card}>
                                        <h3 className="mb-2 text-sm font-semibold">{section.title}</h3>
                                        <ul className="text-muted-foreground list-disc space-y-1.5 pl-5 text-sm">
                                            {section.points.map((point) => (
                                                <li key={point}>{point}</li>
                                            ))}
                                        </ul>
                                    </section>
                                ))}
                                {relatedTrouble.length > 0 && (
                                    <section className={card}>
                                        <h3 className="mb-2 text-sm font-semibold">{ui.related}</h3>
                                        <ul className="space-y-2 text-sm">
                                            {relatedTrouble.map((entry) => (
                                                <li key={entry.problem}>
                                                    <p className="font-medium">{entry.problem}</p>
                                                    <p className="text-muted-foreground">{entry.fix}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                )}
                            </>
                        )}

                        {active === TROUBLE_KEY && (
                            <>
                                <div>
                                    <h2 className="text-lg font-semibold">{ui.stuck}</h2>
                                    <p className="text-muted-foreground text-sm">{ui.stuckIntro}</p>
                                </div>
                                {matchingTrouble.length === 0 && <p className="text-muted-foreground text-sm">{ui.nothing}</p>}
                                {matchingTrouble.map((entry) => (
                                    <section key={entry.problem} className={cn(card, 'space-y-2')}>
                                        <h3 className="text-sm font-semibold">{entry.problem}</h3>
                                        <p className="text-sm">
                                            <span className="font-medium">{ui.why}</span>
                                            <span className="text-muted-foreground">{entry.why}</span>
                                        </p>
                                        <p className="text-sm">
                                            <span className="font-medium">{ui.fix}</span>
                                            <span className="text-muted-foreground">{entry.fix}</span>
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setActive(entry.topic)}
                                                className="text-brand-primary-text text-xs font-medium underline"
                                            >
                                                {ui.readLogic}
                                            </button>
                                            <LinkChips links={entry.where} />
                                        </div>
                                    </section>
                                ))}
                            </>
                        )}

                        {active === IMPACT_KEY && (
                            <>
                                <div>
                                    <h2 className="text-lg font-semibold">{ui.impact}</h2>
                                    <p className="text-muted-foreground text-sm">{ui.impactIntro}</p>
                                </div>
                                {IMPACT.map((row) => (
                                    <section key={row.action} className={card}>
                                        <h3 className="mb-2 text-sm font-semibold">{row.action}</h3>
                                        <dl className="divide-brand-card-border divide-y text-sm">
                                            {row.effects.map((effect) => (
                                                <div key={effect.target} className="grid gap-1 py-2 sm:grid-cols-[14rem_1fr]">
                                                    <dt className="font-medium">{effect.target}</dt>
                                                    <dd className="text-muted-foreground">{effect.effect}</dd>
                                                </div>
                                            ))}
                                        </dl>
                                    </section>
                                ))}
                            </>
                        )}

                        {active === CHANGES_KEY && (
                            <>
                                <div>
                                    <h2 className="text-lg font-semibold">{ui.changes}</h2>
                                    <p className="text-muted-foreground text-sm">{ui.changesIntro}</p>
                                </div>
                                <section className={card}>
                                    <ul className="divide-brand-card-border divide-y text-sm">
                                        {LOG.map((entry) => (
                                            <li key={`${entry.date}-${entry.note}`} className="grid gap-1 py-2 sm:grid-cols-[7rem_10rem_1fr]">
                                                <span className="text-muted-foreground tabular-nums">{entry.date}</span>
                                                <span className="font-medium">{entry.module}</span>
                                                <span className="text-muted-foreground">{entry.note}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
