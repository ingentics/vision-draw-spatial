import type { FieldNote } from '../../../../core/plugins';

/**
 * Verdict du questionnaire pivot (sujet 517) : encadré du panneau et pivot à enregistrer, d'après les deux réponses.
 * Pur : ni lecture ni écriture du post-it.
 */

/** Qui réagit à l'événement sur le mur. */
export type Who = 'other' | 'same' | 'none' | 'unknown';
/** Réponse à la question 2. */
export type Reply = 'yes' | 'no' | 'unknown';

/** Réponses écrites ; absente : pas encore répondue (montrée « On ne sait pas »). */
export interface Answers {
  who?: Who;
  /** Un autre métier : a-t-il besoin d'autre chose que l'événement ? */
  needs?: Reply;
  /** Le même métier ou personne : un métier absent de l'atelier a-t-il besoin de le savoir ? */
  absent?: Reply;
}

export interface Verdict {
  note: FieldNote;
  /** Pivot à écrire (`1`, `0`, `unknown`, undefined : retiré), ou `keep` : celui du post-it reste. */
  pivot: string | undefined | 'keep';
}

const PIVOT: Pick<FieldNote, 'tone' | 'title'> = { tone: 'info', title: 'Pivot' };
const NOT_PIVOT: Pick<FieldNote, 'tone' | 'title'> = { tone: 'neutral', title: 'Pas pivot' };
const TO_CONFIRM: Pick<FieldNote, 'tone' | 'title'> = { tone: 'alert', title: 'Pivot à confirmer' };
const UNCERTAIN: Pick<FieldNote, 'tone' | 'title'> = { tone: 'warning', title: 'Incertain' };

/** Verdict d'un encadré et de son pivot ; `hotspot` : question à noter, sous un filet. */
const verdict = (
  look: Pick<FieldNote, 'tone' | 'title'>,
  text: string,
  pivot: Verdict['pivot'],
  hotspot?: string,
): Verdict => ({
  note: { ...look, text, aside: hotspot === undefined ? undefined : { title: 'Hotspot', text: hotspot } },
  pivot,
});

/**
 * Verdict des réponses ; `label` : texte du post-it, cité dans le hotspot ; `stored` : pivot déjà écrit, montré tel
 * quel quand la question 1 n'a pas de réponse (fichier d'avant le questionnaire).
 */
export function verdictOf(answers: Answers, label: string, stored: string | undefined): Verdict {
  const text = label.replace(/\s+/g, ' ').trim();
  // L'événement cité : son texte entre guillemets (espaces insécables : ils ne vont pas seuls à la ligne), ou « cet
  // événement » s'il n'en a pas.
  const event = text ? `«\u00a0${text}\u00a0»` : 'cet événement';
  switch (answers.who) {
    case undefined: {
      const look = stored === '1' ? PIVOT : stored === '0' ? NOT_PIVOT : stored === 'unknown' ? UNCERTAIN : undefined;
      return look
        ? verdict(look, 'Répondu sans les questions : reprends-les pour le confirmer.', 'keep')
        : verdict(
            { tone: 'neutral', title: 'Non défini' },
            'Réponds aux questions pour qualifier l’événement.',
            undefined,
          );
    }
    case 'unknown':
      return verdict(
        UNCERTAIN,
        'On ne sait pas encore qui réagit à cet événement.',
        'unknown',
        `Qui réagit à ${event} ? Regarder les policies et commandes qui suivent.`,
      );
    case 'other':
      return otherVerdict(answers.needs ?? 'unknown', event);
    // Le même métier ou personne : la même question 2.
    case 'same':
    case 'none':
      return absentVerdict(answers.who, answers.absent ?? 'unknown', event);
  }
}

/** Un autre métier réagit : l'événement lui suffit-il ? */
function otherVerdict(needs: Reply, event: string): Verdict {
  switch (needs) {
    case 'no':
      return verdict(PIVOT, 'Un autre métier prend le relais avec l’événement seul. La frontière est propre.', '1');
    case 'yes':
      return verdict(
        TO_CONFIRM,
        'Un autre métier réagit mais dépend encore du métier qui l’a produit.',
        'unknown',
        `De quoi le métier qui réagit à ${event} a-t-il besoin en plus ? L’ajouter à l’événement ou revoir la frontière.`,
      );
    case 'unknown':
      return verdict(
        UNCERTAIN,
        'On ne sait pas si l’événement suffit à celui qui réagit.',
        'unknown',
        `Le métier qui réagit à ${event} a-t-il besoin d’autre chose que l’événement ?`,
      );
  }
}

/** Le même métier poursuit, ou personne ne réagit : un métier absent de l'atelier en a-t-il besoin ? */
function absentVerdict(who: 'same' | 'none', absent: Reply, event: string): Verdict {
  switch (absent) {
    case 'no':
      return verdict(
        NOT_PIVOT,
        who === 'same'
          ? 'Le même métier poursuit, personne d’autre n’en a besoin.'
          : 'Événement terminal : personne ne prend le relais.',
        '0',
      );
    case 'yes':
      return verdict(
        TO_CONFIRM,
        'Un consommateur existe mais il n’est pas sur le mur.',
        '1',
        `Quel métier absent de l’atelier réagit à ${event} ? À inviter ou à interroger.`,
      );
    case 'unknown':
      return verdict(
        UNCERTAIN,
        'On ne sait pas si un métier absent en a besoin.',
        'keep',
        `Un autre métier a-t-il besoin de savoir que ${event} ?`,
      );
  }
}
